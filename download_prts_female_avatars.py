import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import unquote, urlparse

import requests
from playwright.sync_api import sync_playwright

URL = "https://prts.wiki/w/%E5%B9%B2%E5%91%98%E4%B8%80%E8%A7%88?sex=1_%E5%A5%B3%E6%80%A7&_d=2"
OUT_DIR = Path(r"d:\Document\test_python\2D_tiermaker\assets\operators\all")
OUT_DIR.mkdir(parents=True, exist_ok=True)

TEXT_FEMALE = "\u5973\u6027"
TEXT_AVATAR = "\u5934\u50cf"


def clean_filename(name: str) -> str:
    name = re.sub(r"[\\/:*?\"<>|]+", "_", (name or "").strip())
    return name[:120] if name else "unknown.png"


def normalize_src(src: str) -> str:
    if not src:
        return ""
    if src.startswith("//"):
        src = "https:" + src
    p = urlparse(src)
    return p._replace(query="", fragment="").geturl()


def ensure_toggle_selected(page, text_value: str):
    page.evaluate(
        """
        (txt) => {
          const btn = [...document.querySelectorAll('div.checkbox-container')]
            .find(el => (el.textContent || '').trim() === txt);
          if (!btn) return;
          if (!(btn.className || '').includes('selected')) btn.click();
        }
        """,
        text_value,
    )
    page.wait_for_timeout(800)


def get_total_count(page) -> int:
    txt = page.evaluate("document.body.innerText")
    m = re.search(r"\u5171(\d+)\u6761", txt)
    return int(m.group(1)) if m else 0


def get_total_pages(page) -> int:
    nums = page.evaluate(
        """
        () => {
          const els = [...document.querySelectorAll('#pagination div.checkbox-container')];
          return els
            .map(el => (el.textContent || '').trim())
            .filter(t => /^\d+$/.test(t))
            .map(t => Number(t));
        }
        """
    )
    return max(nums) if nums else 1


def get_first_avatar_src(page) -> str:
    return page.evaluate(
        """
        () => {
          const img = document.querySelector('#filter-result img.avatar');
          return img ? (img.currentSrc || img.src || '') : '';
        }
        """
    )


def click_page(page, page_num: int) -> bool:
    before = get_first_avatar_src(page)
    clicked = page.evaluate(
        """
        (n) => {
          const target = String(n);
          const btn = [...document.querySelectorAll('#pagination div.checkbox-container')]
            .find(el => (el.textContent || '').trim() === target);
          if (!btn) return false;
          btn.click();
          return true;
        }
        """,
        page_num,
    )
    if not clicked:
        return False

    for _ in range(40):
        page.wait_for_timeout(200)
        current = get_first_avatar_src(page)
        selected_ok = page.evaluate(
            """
            (n) => [...document.querySelectorAll('#pagination div.selected.checkbox-container')]
              .some(el => (el.textContent || '').trim() === String(n))
            """,
            page_num,
        )
        if selected_ok or (current and current != before):
            return True

    return True


def collect_current_page_urls(page):
    urls = page.evaluate(
        """
        () => {
          const imgs = [...document.querySelectorAll('#filter-result img.avatar')];
          return imgs.map(img => img.currentSrc || img.src || '').filter(Boolean);
        }
        """
    )
    return [normalize_src(u) for u in urls if normalize_src(u)]


def download_all(urls):
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://prts.wiki/",
    })

    adapter = requests.adapters.HTTPAdapter(pool_connections=48, pool_maxsize=48)
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    def task(src: str) -> str:
        path = unquote(urlparse(src).path)
        base = Path(path).name or "unknown.png"
        base = clean_filename(base)
        if "." not in base:
            base += ".png"

        fp = OUT_DIR / base
        if fp.exists() and fp.stat().st_size > 0:
            return "skipped"

        try:
            r = session.get(src, timeout=12)
            r.raise_for_status()
            fp.write_bytes(r.content)
            return "downloaded"
        except Exception:
            return "failed"

    downloaded = 0
    skipped = 0
    failed = 0

    with ThreadPoolExecutor(max_workers=20) as ex:
        futures = [ex.submit(task, u) for u in sorted(urls)]
        for i, fut in enumerate(as_completed(futures), 1):
            result = fut.result()
            if result == "downloaded":
                downloaded += 1
            elif result == "skipped":
                skipped += 1
            else:
                failed += 1
            if i % 50 == 0:
                print(f"progress={i}/{len(futures)}")

    existing = len([p for p in OUT_DIR.iterdir() if p.is_file() and p.name != ".gitkeep"])
    return downloaded, skipped, failed, existing


def main():
    urls = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1600, "height": 1200})

        page.goto(URL, wait_until="domcontentloaded", timeout=120000)
        page.wait_for_timeout(2500)

        ensure_toggle_selected(page, TEXT_FEMALE)
        ensure_toggle_selected(page, TEXT_AVATAR)

        total_count = get_total_count(page)
        total_pages = get_total_pages(page)

        for src in collect_current_page_urls(page):
            urls.add(src)

        for n in range(2, total_pages + 1):
            if click_page(page, n):
                for src in collect_current_page_urls(page):
                    urls.add(src)

        browser.close()

    print(f"page_total_count={total_count}")
    print(f"page_total_pages={total_pages}")
    print(f"url_collected={len(urls)}")

    downloaded, skipped, failed, existing = download_all(urls)

    print(f"downloaded={downloaded}")
    print(f"skipped={skipped}")
    print(f"failed={failed}")
    print(f"files_in_all={existing}")
    print(f"output_dir={OUT_DIR}")


if __name__ == "__main__":
    main()
