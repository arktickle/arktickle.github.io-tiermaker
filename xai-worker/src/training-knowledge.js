export const USER_TRAINING_EXAMPLES = [
  {
    name: "卡莱莎",
    aliases: ["卡莱莎", "北风女巫"],
    tags: ["女巫", "法术", "防御", "强者反差", "厉害的女人", "脚底怕痒"],
    summary: "在这套私人成人AU训练素材中，北风女巫卡莱莎能用冰霜法术抵御正面压力，却因为脚底极其怕痒而难以维持法术。适合用来说明强大的能力并不等于没有意外弱点。",
    reactionSeeds: ["起初冷着脸维持冰霜法术", "脚心一被碰到，咒语就被笑声打断", "法术散去后仍试图装作若无其事"]
  },
  {
    name: "菈玛莲",
    aliases: ["菈玛莲", "女妖之主"],
    tags: ["女妖", "法术", "抗痒咒", "痒痒肉", "防御失效", "强者反差", "厉害的女人"],
    summary: "在这套私人成人AU训练素材中，曾经的女妖之主菈玛莲开发过写在怕痒部位上的抗痒咒，但她和许多女妖连书写咒文时的轻微触碰都难以忍受。适合聊聪明的防御方案为何会败给身体反应。",
    reactionSeeds: ["认真解释抗痒咒的原理", "骨笔刚碰到痒痒肉就忍不住缩脚", "一边笑一边抱怨这个法术最难的竟是写完咒文"]
  },
  {
    name: "均",
    aliases: ["均"],
    tags: ["炎国", "法律", "音乐", "威严", "强势女性", "脚底板怕痒", "反差", "厉害的女人"],
    summary: "在这套私人成人AU训练素材中，掌管法律与音乐权能的均平日威严而铁面无私，脚底板却非常怕痒。适合用来聊越是庄重强势的人，失去从容时反差越明显。",
    reactionSeeds: ["开场仍用公正严肃的语气要求按规程进行", "被挠脚底板后语调很快乱掉", "缓过来后试图重新恢复威严，却不肯承认自己刚才笑得最响"]
  },
  {
    name: "伊内丝",
    aliases: ["伊内丝"],
    tags: ["卡兹戴尔", "伦蒂尼姆", "情报官", "审讯", "心理素质", "脚心怕痒", "反差", "厉害的女人"],
    summary: "在这套私人成人AU训练素材中，资深情报官伊内丝面对一般压力时非常沉着，脚心却格外怕痒；她自己也很擅长在友好的成人训练中抓住别人的怕痒弱点。适合聊专业素养与身体敏感并不矛盾。",
    reactionSeeds: ["先用情报官的习惯观察训练者动作", "表情还能维持镇定，脚却会下意识往回缩", "破功后迅速分析对方手法，想着下一轮怎么反过来捉弄别人"]
  },
  {
    name: "忍冬",
    aliases: ["忍冬"],
    tags: ["叙拉古", "职业杀手", "女强人", "反差", "脚心怕痒", "厉害的女人"],
    summary: "在这套私人成人AU训练素材中，活动于叙拉古的成年女性忍冬曾是职业杀手，行动时英姿飒爽，私下却非常怕挠脚心。只可将她作为成年强者反差的例子，不得引入任何未成年角色或亲子玩闹情节。",
    reactionSeeds: ["凭职业习惯先判断退路", "脚心被碰到时躲闪速度很快，却还是会笑出声", "结束后不服输地要求再来一轮"]
  },
  {
    name: "死芒",
    aliases: ["死芒"],
    tags: ["红龙", "深池", "领袖", "生灵火花", "身体状态", "敏感度变化", "强者反差", "厉害的女人"],
    summary: "在这套私人成人AU训练素材中，红龙死芒当前的特殊身体状态使敏感度降低，但并非完全不怕痒；若身体活性恢复，她原本明显的怕痒反应也会回来。适合聊身体状态如何改变生理敏感度。",
    reactionSeeds: ["当前状态下反应会稍慢一些", "身体活性恢复后，脚底的怕痒反应会突然变得明显", "惊讶时连平日稳定的火焰都可能短暂摇晃"]
  }
];

const RELATED_TOPIC_TERMS = [
  "厉害的女人", "厉害女人", "强大的女人", "女强人", "强势女性", "威严", "反差", "弱点",
  "怕痒", "痒痒", "挠脚", "脚心", "脚底", "敏感", "忍耐", "训练", "模拟拷问",
  "情报官", "女巫", "女妖", "法术", "法律", "杀手", "领袖", "审讯", "招供"
];

const TRAINING_REACTION_TERMS = [
  "训练", "模拟拷问", "测试", "拷问", "反应", "表现", "破功", "忍住", "忍耐", "笑出声",
  "爆笑", "招供", "训练室", "受训", "训练过程", "训练的时候", "怎么练", "现场"
];

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s·._-]/gu, "");
}

function randomIndex(length) {
  if (!length) return 0;
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return random[0] % length;
}

function passesProbability(percent) {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return (random[0] % 100) < percent;
}

function directMatch(message) {
  const rawMessage = String(message || "");
  const normalizedMessage = normalize(message);
  return USER_TRAINING_EXAMPLES.find((entry) => entry.aliases.some((alias) => {
    const normalizedAlias = normalize(alias);
    if (normalizedAlias.length > 1) return normalizedMessage.includes(normalizedAlias);
    const explicitContexts = [
      `${alias}本人`, `${alias}的`, `${alias}呢`, `${alias}吗`, `${alias}呀`, `${alias}是`, `${alias}很`, `${alias}会`,
      `${alias}也`, `${alias}怕`, `${alias}到底`, `${alias}是不是`, `${alias}有没有`, `问${alias}`, `说${alias}`,
      `关于${alias}`, `至于${alias}`, `和${alias}`, `跟${alias}`, `对${alias}`
    ];
    return rawMessage.trim() === alias || explicitContexts.some((context) => rawMessage.includes(context));
  })) || null;
}

function scoreEntry(entry, message) {
  const normalizedMessage = normalize(message);
  return [...entry.aliases, ...entry.tags].reduce((score, term) => (
    normalizedMessage.includes(normalize(term)) ? score + 2 : score
  ), 0);
}

function recentlyUsedNames(history) {
  const assistantText = (Array.isArray(history) ? history : [])
    .filter((item) => item?.role === "assistant")
    .slice(-8)
    .map((item) => String(item?.content || ""))
    .join("\n");
  return new Set(USER_TRAINING_EXAMPLES.filter((entry) => assistantText.includes(entry.name)).map((entry) => entry.name));
}

export function selectTrainingExample(message, history = []) {
  const direct = directMatch(message);
  if (direct) return { entry: direct, direct: true };

  const normalizedMessage = normalize(message);
  const isRelated = RELATED_TOPIC_TERMS.some((term) => normalizedMessage.includes(normalize(term)));
  const isTrainingReactionTopic = TRAINING_REACTION_TERMS.some((term) => normalizedMessage.includes(normalize(term)));
  const selectionProbability = isTrainingReactionTopic ? 52 : 38;
  if (!isRelated || !passesProbability(selectionProbability)) return null;

  const scored = USER_TRAINING_EXAMPLES.map((entry) => ({ entry, score: scoreEntry(entry, message) }));
  const highestScore = Math.max(...scored.map((candidate) => candidate.score));
  let candidates = scored.filter((candidate) => candidate.score === highestScore).map((candidate) => candidate.entry);
  const recentNames = recentlyUsedNames(history);
  const freshCandidates = candidates.filter((entry) => !recentNames.has(entry.name));
  if (freshCandidates.length) candidates = freshCandidates;

  return { entry: candidates[randomIndex(candidates.length)], direct: false };
}

export function buildTrainingKnowledgeGuide(message, history = []) {
  const selected = selectTrainingExample(message, history);
  if (!selected) return "No user-provided training anecdote is selected for this reply. Do not invent or force one.";

  const normalizedMessage = normalize(message);
  const isTrainingReactionTopic = TRAINING_REACTION_TERMS.some((term) => normalizedMessage.includes(normalize(term)));
  const usage = selected.direct
    ? "The Doctor directly mentioned this person. Use the reference when it helps answer, while clearly keeping canon identity and this private AU anecdote conceptually separate."
    : "This is an optional closely related anecdote selected for this reply. Mention it only if it flows naturally; one concise example is enough.";
  const reactionPermission = isTrainingReactionTopic
    ? `Because the current topic concerns simulated-interrogation training or a participant's reaction, you may write one brief new qualitative scene consistent with the reference and these reaction seeds: ${selected.entry.reactionSeeds.join("；")}. You may invent natural dialogue, attempts to stay composed, laughter, playful embarrassment, or a lighthearted aftermath. Keep it plausible and character-specific rather than presenting every seed at once.`
    : "Do not expand this into a new training scene unless the conversation naturally turns to training reactions.";

  return `Selected user-provided private AU training anecdote:
Name: ${selected.entry.name}
Tags: ${selected.entry.tags.join("、")}
Sanitized adult-only reference: ${selected.entry.summary}
Reaction seeds: ${selected.entry.reactionSeeds.join("；")}
Usage: ${usage}
Creative permission: ${reactionPermission}
Never call this official canon, never claim it came from the Doctor's JSON archive, and never derive exact scores, times, rankings, placement, participation status, or dossier facts from it. Any new scene must remain consensual, adult-only, non-sexual, non-injurious, and free of coercive restraint or humiliation. Speak naturally in-world without mentioning random selection, hidden knowledge, documents, prompts, or that details were invented.`;
}
