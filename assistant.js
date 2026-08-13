(() => {
  const toggle = document.getElementById("commsToggle");
  const panel = document.getElementById("commsPanel");
  const transcript = document.getElementById("commsTranscript");
  const questions = document.getElementById("commsQuestions");
  const typing = document.getElementById("commsTyping");
  if (!toggle || !panel || !transcript || !questions || !typing) return;

  const conversations = {
    "system-guide": [
      "博士，我们从干员数据库开始。你可以在页面下方搜索代号，再将头像拖入中央矩阵；拖动已经定位的头像可以随时调整位置。",
      "横轴代表生理敏感度，干员所在的位置越向右分数越高，通俗来说就是她的脚底越怕痒；纵轴代表心理忍耐力，越向上分数越高，也就是面对搔痒的态度更顽强。干员名片中的整数分数会依据坐标自动换算，不需要手动输入。",
      "在横轴或纵轴上单击，可以增加一个分区节点；再次单击节点即可删除。矩阵会依照这些节点自动划分区段。",
      "右侧的区段参数用于修改每个区段的标题、说明和识别颜色。标题会显示在矩阵外侧；将光标移到对应区段时，区域与其中的头像边框都会高亮，并显示说明。",
      "控制台上方的头像尺寸滑杆可以统一调整矩阵头像大小；切换名称按钮则控制已定位头像下方是否显示代号。",
      "博士，请留意：轻点已经定位的头像会将其移出矩阵。若使用鼠标右键点击头像，则会打开干员名片，你可以填写介绍文本来记录一下她面对搔痒时的有趣事实，内容会被自动记忆。",
      "名片会根据坐标显示生理敏感度与心理忍耐力。模拟拷问数据中可以登记爆笑用时和招供用时，格式为 HH:MM:SS.mmm，其中最后三位是毫秒；排名窗口会根据已有数据自动排序。",
      "矩阵右下和左上的报告按钮可以分别生成横轴或纵轴报告。报告按高位区段到低位区段排列头像，点击其中的头像也能进入干员名片。",
      "导出矩阵与导出报告都会生成 PNG 图片。图片包含标题、标识和公开网页地址；PNG 本身不保存真正的可点击链接，部分系统只会借助文字识别临时提供跳转。",
      "保存存档会将当前布局写入浏览器，同时允许下载 JSON 文件。载入存档可恢复节点、区段、头像位置、名片文本和模拟拷问数据，并兼容过去版本。",
      "以上就是主要操作，博士。建议在完成一轮定位后及时保存并下载存档，避免浏览器数据被清理后失去记录。"
    ]
  };

  let sequenceToken = 0;

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function scrollTranscript() {
    transcript.scrollTo({ top: transcript.scrollHeight, behavior: "smooth" });
  }

  function appendMessage(text) {
    const message = document.createElement("div");
    message.className = "comms-message";
    message.textContent = text;
    transcript.appendChild(message);
    scrollTranscript();
  }

  function setOpen(open) {
    sequenceToken += 1;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "关闭凯尔希通信" : "打开凯尔希通信");
    typing.hidden = true;
    questions.querySelectorAll("button").forEach((button) => {
      button.disabled = false;
    });
    if (open) {
      window.requestAnimationFrame(() => questions.querySelector("button")?.focus({ preventScroll: true }));
    } else {
      toggle.focus({ preventScroll: true });
    }
  }

  async function playConversation(id, button) {
    const lines = conversations[id];
    if (!lines) return;
    const token = ++sequenceToken;
    questions.querySelectorAll("button").forEach((item) => {
      item.disabled = true;
    });
    transcript.replaceChildren();
    appendMessage("博士，明白。请听我依次说明。");

    for (const line of lines) {
      if (token !== sequenceToken || panel.hidden) return;
      typing.hidden = false;
      scrollTranscript();
      const transmissionDelay = Math.min(2800, 1900 + line.length * 9);
      await wait(transmissionDelay);
      if (token !== sequenceToken || panel.hidden) return;
      typing.hidden = true;
      appendMessage(line);
      await wait(720);
    }

    if (token !== sequenceToken || panel.hidden) return;
    questions.querySelectorAll("button").forEach((item) => {
      item.disabled = false;
    });
    button.focus({ preventScroll: true });
  }

  toggle.addEventListener("click", () => {
    setOpen(panel.hidden);
  });

  questions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-comms-question]");
    if (!button || button.disabled) return;
    playConversation(button.dataset.commsQuestion, button);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });
})();
