(() => {
  const toggle = document.getElementById("commsToggle");
  const unreadBadge = document.getElementById("commsUnread");
  const panel = document.getElementById("commsPanel");
  const directory = document.getElementById("commsDirectory");
  const reasoningControl = document.getElementById("commsReasoning");
  const chat = document.getElementById("commsChat");
  const contactsElement = document.getElementById("commsContacts");
  const back = document.getElementById("commsBack");
  const portrait = document.querySelector(".comms-portrait");
  const portraitImage = document.getElementById("commsPortraitImage");
  const portraitImageSecondary = document.getElementById("commsPortraitImageSecondary");
  const channelLabel = document.getElementById("commsChannelLabel");
  const title = document.getElementById("commsTitle");
  const transcript = document.getElementById("commsTranscript");
  const typing = document.getElementById("commsTyping");
  const suggestion = document.getElementById("commsSuggestion");
  const suggestionButton = document.getElementById("commsSuggestionBtn");
  const composer = document.getElementById("commsComposer");
  const input = document.getElementById("commsInput");
  const sendButton = document.getElementById("commsSend");
  const serviceStatus = document.getElementById("commsServiceStatus");
  if (!toggle || !unreadBadge || !panel || !directory || !reasoningControl || !chat || !contactsElement || !back || !portrait || !portraitImage || !portraitImageSecondary || !channelLabel || !title || !transcript || !typing || !suggestion || !suggestionButton || !composer || !input || !sendButton || !serviceStatus) return;

  const contacts = {
    group: {
      name: "医疗部联合通信",
      speaker: "RHODES LINK",
      portraits: ["assets/operators/all/头像_凯尔希·思衡托.png", "assets/operators/all/头像_Mon3tr.png"],
      channel: "RHODES ISLAND / JOINT MEDICAL CHANNEL",
      intro: "凯尔希与 Mon3tr 已加入联合通信。",
      suggestion: "你们如何看待这套模拟拷问训练？",
      initialMessages: [
        { role: "assistant", speakerId: "kaltsit", text: "博士，联合通信已经建立。你可以直接向我们两人提问。" },
        { role: "assistant", speakerId: "mon3tr", text: "我也在呀，有什么想问的就说吧" }
      ]
    },
    kaltsit: {
      name: "凯尔希",
      speaker: "KAL'TSIT",
      portrait: "assets/operators/all/头像_凯尔希·思衡托.png",
      channel: "RHODES ISLAND / SECURE CHANNEL",
      intro: "博士，如果你需要，我可以为你说明这套分析系统的操作方式。",
      suggestion: "如何操作这个系统？",
      fallback: [
        "博士，我们从干员数据库开始。你可以在页面下方搜索代号，再将头像拖入中央矩阵；拖动已经定位的头像可以随时调整位置。",
        "横轴代表生理敏感度，干员所在的位置越向右分数越高，通俗来说就是她的脚底越怕痒；纵轴代表心理忍耐力，越向上分数越高，也就是面对搔痒的态度更顽强。干员名片中的整数分数会依据坐标自动换算，不需要手动输入。",
        "在横轴或纵轴上单击，可以增加一个分区节点；再次单击节点即可删除。矩阵会依照这些节点自动划分区段。",
        "右侧的区段参数用于修改每个区段的标题、说明和识别颜色。标题会显示在矩阵外侧；将光标移到对应区段时，区域与其中的头像边框都会高亮，并显示说明。",
        "控制台上方的头像尺寸滑杆可以统一调整矩阵头像大小；切换名称按钮则控制已定位头像下方是否显示代号。",
        "博士，请留意：轻点已经定位的头像会将其移出矩阵。若使用鼠标右键点击头像，则会打开干员名片，你可以填写介绍文本来记录一下她面对搔痒时的有趣事实，内容会被自动记忆。",
        "名片会根据坐标显示生理敏感度与心理忍耐力。模拟拷问数据中可以登记爆笑用时和招供用时，格式为 HH:MM:SS.mmm，其中最后三位是毫秒；排名窗口会根据已有数据自动排序。",
        "控制台上方的纵轴报告和横轴报告按钮可以分别生成单轴报告。报告按高位区段到低位区段排列头像，点击其中的头像也能进入干员名片。",
        "导出矩阵与导出报告都会生成 PNG 图片。图片包含标题、标识和公开网页地址；PNG 本身不保存真正的可点击链接，部分系统只会借助文字识别临时提供跳转。",
        "保存存档会将当前布局写入浏览器，同时允许下载 JSON 文件。载入存档可恢复节点、区段、头像位置、名片文本和模拟拷问数据，并兼容过去版本。",
        "以上就是主要操作，博士。建议在完成一轮定位后及时保存并下载存档，避免浏览器数据被清理后失去记录。"
      ]
    },
    mon3tr: {
      name: "Mon3tr",
      speaker: "MON3TR",
      portrait: "assets/operators/all/头像_Mon3tr.png",
      channel: "RHODES ISLAND / MEDICAL CHANNEL",
      intro: "想了解医疗部的模拟拷问训练记录吗，博士？",
      suggestion: "模拟拷问数据是什么？",
      fallback: [
        "简单来说，模拟拷问数据是罗德岛医疗部为了提升情报安全，为多位成年女性干员安排的模拟拷问训练记录。",
        "至于训练方式嘛——当然就是挠脚心啦！因为女生的脚底有很多痒痒肉嘛。罗德岛上有很多厉害的女人，最大的弱点就是特别怕挠脚心呢。",
        "系统会记录她们忍住不笑和坚持到招供所用的时间，再结合矩阵坐标形成训练数据。",
        "放心，整个流程由医疗部监督，安全、可控，只是训练室里偶尔会热闹得让人忍不住一起笑出声！",
        "不过博士，为了罗德岛的情报安全，可不要把这些数据泄露到外人手里哦。"
      ]
    }
  };

  const chatState = Object.fromEntries(Object.entries(contacts).map(([id, contact]) => [id, {
    messages: contact.initialMessages || [{ role: "assistant", speakerId: id, text: contact.intro }],
    pending: false,
    suggestionAvailable: true,
    unread: 0
  }]));
  const endpoint = String(window.XAI_CHAT_ENDPOINT || "").trim();
  const reasoningStorageKey = "arknights_tk_reasoning_effort_v1";
  const reasoningEfforts = new Set(["low", "medium", "high"]);
  let activeContactId = null;
  let reasoningEffort = "medium";
  let groupLeadIndex = 0;

  try {
    const savedEffort = localStorage.getItem(reasoningStorageKey);
    if (reasoningEfforts.has(savedEffort)) reasoningEffort = savedEffort;
  } catch (error) {
    // The control still works for this page when browser storage is unavailable.
  }

  function renderReasoningEffort() {
    reasoningControl.querySelectorAll("button[data-reasoning-effort]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.reasoningEffort === reasoningEffort));
    });
  }

  function setReasoningEffort(nextEffort) {
    if (!reasoningEfforts.has(nextEffort)) return;
    reasoningEffort = nextEffort;
    renderReasoningEffort();
    try {
      localStorage.setItem(reasoningStorageKey, reasoningEffort);
    } catch (error) {
      // Keep the in-memory selection when browser storage is unavailable.
    }
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function isActiveChat(contactId) {
    return !panel.hidden && !chat.hidden && activeContactId === contactId;
  }

  function scrollTranscript(instant = false) {
    transcript.scrollTo({ top: transcript.scrollHeight, behavior: instant ? "auto" : "smooth" });
  }

  function createMessageElement(message, contactId) {
    const element = document.createElement("div");
    const isUser = message.role === "user";
    const speakerId = isUser ? "doctor" : message.speakerId || (contactId === "group" ? "system" : contactId);
    element.className = `comms-message${isUser ? " comms-message-user" : ""}${message.error ? " comms-message-error" : ""}`;
    element.dataset.speaker = isUser ? "DOCTOR" : contacts[speakerId]?.speaker || contacts[contactId].speaker;
    element.dataset.character = speakerId;
    element.textContent = message.text;
    return element;
  }

  function renderTranscript(contactId) {
    transcript.replaceChildren(...chatState[contactId].messages.map((message) => createMessageElement(message, contactId)));
    window.requestAnimationFrame(() => scrollTranscript(true));
  }

  function setTyping(contactId, visible) {
    if (activeContactId === contactId && !chat.hidden) {
      typing.hidden = !visible;
      if (visible) scrollTranscript();
    }
  }

  function formatUnread(count) {
    return count > 99 ? "99+" : String(count);
  }

  function updateUnreadIndicators() {
    let total = 0;
    Object.entries(chatState).forEach(([contactId, state]) => {
      const count = Math.max(0, Number(state.unread) || 0);
      total += count;
      const badge = contactsElement.querySelector(`[data-comms-contact="${contactId}"] .comms-contact-unread`);
      if (badge) {
        badge.textContent = formatUnread(count);
        badge.hidden = count === 0;
      }
    });
    unreadBadge.textContent = formatUnread(total);
    unreadBadge.hidden = total === 0;
  }

  function addUnread(contactId) {
    const state = chatState[contactId];
    if (!state) return;
    state.unread += 1;
    updateUnreadIndicators();
  }

  function clearUnread(contactId) {
    const state = chatState[contactId];
    if (!state || state.unread === 0) return;
    state.unread = 0;
    updateUnreadIndicators();
  }

  function updateContactPreview(contactId, text) {
    const preview = contactsElement.querySelector(`[data-comms-contact="${contactId}"] .comms-contact-copy small`);
    if (preview) preview.textContent = text;
  }

  function addMessage(contactId, message, countAsUnread = false) {
    chatState[contactId].messages.push(message);
    updateContactPreview(contactId, message.text);
    if (isActiveChat(contactId)) {
      transcript.appendChild(createMessageElement(message, contactId));
      scrollTranscript();
    } else if (countAsUnread && message.role === "assistant") {
      addUnread(contactId);
    }
  }

  function updateSuggestion() {
    const contact = contacts[activeContactId];
    const visible = Boolean(contact && chatState[activeContactId]?.suggestionAvailable);
    suggestion.hidden = !visible;
    if (visible) suggestionButton.textContent = contact.suggestion;
  }

  function updateComposer(contactId) {
    const pending = chatState[contactId]?.pending === true;
    input.disabled = pending;
    sendButton.disabled = pending;
    setTyping(contactId, pending);
  }

  function openChat(contactId, focusInput = false) {
    const contact = contacts[contactId];
    if (!contact) return;

    activeContactId = contactId;
    clearUnread(contactId);
    directory.hidden = true;
    chat.hidden = false;
    const portraits = contact.portraits || [contact.portrait];
    portraitImage.src = portraits[0];
    portraitImageSecondary.src = portraits[1] || portraits[0];
    portraitImageSecondary.hidden = portraits.length < 2;
    portrait.classList.toggle("is-group", portraits.length > 1);
    channelLabel.textContent = contact.channel;
    title.textContent = contact.name;
    typing.setAttribute("aria-label", `${contact.name}正在输入`);
    serviceStatus.hidden = true;
    renderTranscript(contactId);
    updateSuggestion();
    updateComposer(contactId);
    if (focusInput) window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }

  function showDirectory(focusFirstContact = false) {
    activeContactId = null;
    typing.hidden = true;
    chat.hidden = true;
    directory.hidden = false;
    if (focusFirstContact) window.requestAnimationFrame(() => contactsElement.querySelector("button")?.focus({ preventScroll: true }));
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "关闭通信窗口" : "打开通信窗口");
    if (open) {
      showDirectory(true);
    } else {
      activeContactId = null;
      chat.hidden = true;
      directory.hidden = false;
      typing.hidden = true;
      toggle.focus({ preventScroll: true });
    }
  }

  function getArchiveContext() {
    if (typeof window.getArknightsTkAiContext === "function") {
      return window.getArknightsTkAiContext();
    }
    try {
      return JSON.parse(localStorage.getItem("arknights_tk_board_state_v1") || "null");
    } catch (error) {
      return null;
    }
  }

  function buildHistory(contactId) {
    return chatState[contactId].messages
      .filter((message) => !message.error)
      .slice(-18, -1)
      .map((message) => ({ role: message.role, content: message.text }));
  }

  function buildGroupHistory(excludeLatestUser = false) {
    let messages = chatState.group.messages.filter((message) => !message.error);
    if (excludeLatestUser && messages.at(-1)?.role === "user") messages = messages.slice(0, -1);
    return messages.slice(-36).map((message) => ({
      role: message.role,
      speaker: message.role === "user" ? "doctor" : message.speakerId,
      content: message.text
    }));
  }

  async function requestAiReply(contactId, userText, options = {}) {
    const conversationMode = options.conversationMode === "group" ? "group" : "private";
    const groupTurn = options.groupTurn === "response" ? "response" : options.groupTurn === "lead" ? "lead" : "solo";
    if (!endpoint) {
      if (userText.trim() === contacts[contactId].suggestion) return contacts[contactId].fallback;
      throw new Error("智能通信后端尚未配置；部署 xai-worker 后，请在 xai-config.js 中填写 Worker 地址。");
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character: contactId,
        message: userText,
        reasoningEffort,
        conversationMode,
        groupTurn,
        history: conversationMode === "group" ? [] : buildHistory(contactId),
        groupHistory: buildGroupHistory(conversationMode === "group" && groupTurn === "lead"),
        archive: getArchiveContext()
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `通信服务返回错误（${response.status}）`);
    if (!Array.isArray(data.messages) || data.messages.length === 0) throw new Error("通信服务没有返回有效消息。");
    return data.messages.map((message) => String(message).trim()).filter(Boolean);
  }

  async function deliverReplies(targetContactId, speakerId, replies) {
    for (const reply of replies) {
      await wait(2400 + Math.min(1600, reply.length * 8));
      addMessage(targetContactId, { role: "assistant", speakerId, text: reply }, true);
    }
  }

  async function sendPrivateMessage(contactId, userText) {
    const state = chatState[contactId];
    if (!state || state.pending) return;

    addMessage(contactId, { role: "user", text: userText });
    state.pending = true;
    updateComposer(contactId);
    serviceStatus.hidden = true;

    try {
      const replies = await requestAiReply(contactId, userText);
      await deliverReplies(contactId, contactId, replies);
    } catch (error) {
      addMessage(contactId, {
        role: "assistant",
        speakerId: contactId,
        text: error?.message || "通信暂时中断，请稍后重试。",
        error: true
      });
      if (isActiveChat(contactId)) {
        serviceStatus.textContent = "AI LINK OFFLINE / 请检查 Worker 配置";
        serviceStatus.hidden = false;
      }
    } finally {
      state.pending = false;
      updateComposer(contactId);
      if (isActiveChat(contactId)) input.focus({ preventScroll: true });
    }
  }

  async function sendGroupMessage(userText) {
    const contactId = "group";
    const state = chatState[contactId];
    if (state.pending) return;

    addMessage(contactId, { role: "user", text: userText });
    state.pending = true;
    updateComposer(contactId);
    serviceStatus.hidden = true;

    const order = groupLeadIndex % 2 === 0 ? ["kaltsit", "mon3tr"] : ["mon3tr", "kaltsit"];
    groupLeadIndex += 1;
    let hadError = false;

    for (const [index, speakerId] of order.entries()) {
      try {
        const replies = await requestAiReply(speakerId, userText, {
          conversationMode: "group",
          groupTurn: index === 0 ? "lead" : "response"
        });
        await deliverReplies(contactId, speakerId, replies);
      } catch (error) {
        hadError = true;
        addMessage(contactId, {
          role: "assistant",
          speakerId,
          text: error?.message || `${contacts[speakerId].name}的通信暂时中断。`,
          error: true
        });
      }
    }

    state.pending = false;
    updateComposer(contactId);
    if (hadError && isActiveChat(contactId)) {
      serviceStatus.textContent = "PARTIAL LINK / 部分通信暂时中断";
      serviceStatus.hidden = false;
    }
    if (isActiveChat(contactId)) input.focus({ preventScroll: true });
  }

  function sendMessage(contactId, userText) {
    return contactId === "group" ? sendGroupMessage(userText) : sendPrivateMessage(contactId, userText);
  }

  contactsElement.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-comms-contact]");
    if (button) openChat(button.dataset.commsContact, true);
  });

  reasoningControl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-reasoning-effort]");
    if (button) setReasoningEffort(button.dataset.reasoningEffort);
  });

  back.addEventListener("click", () => showDirectory(true));
  toggle.addEventListener("click", () => setOpen(panel.hidden));

  suggestionButton.addEventListener("click", () => {
    if (!activeContactId || !chatState[activeContactId]?.suggestionAvailable) return;
    input.value = contacts[activeContactId].suggestion;
    chatState[activeContactId].suggestionAvailable = false;
    updateSuggestion();
    input.dispatchEvent(new Event("input"));
    input.focus({ preventScroll: true });
  });

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const contactId = activeContactId;
    const value = input.value.trim();
    if (!contactId || !value || chatState[contactId].pending) return;
    input.value = "";
    input.style.height = "auto";
    sendMessage(contactId, value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });

  showDirectory();
  renderReasoningEffort();
  updateUnreadIndicators();
})();
