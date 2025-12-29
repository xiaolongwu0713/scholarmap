QC1做的是输入内容的合法性检测，输入的语言不限制。
如果有违反的，实时显示违反信息在输入框的右上角，且把输入框下面的按钮灰掉。

该阶段主要检测：
 - 字符长度50-200个字符（包括所有语言）；
 - 不允许 HTML、Markdown 链接、富文本标签，URL，邮箱，手机号，微信号;
 - 最大换行数（例如 ≤ 5）;
 - 对输入进行字符识别。字符识别方式如下：

对输入文本提取英文 tokens（字母/连字符/撇号），将每个 token 分类为：
correct：高置信拼写正确（常见词、词典存在、或技术词形豁免）
misspelled：高置信拼写错误（不在词典，但存在“距离很近且高频”的纠错候选）
unknown：不在词典、也没有可信纠错候选（可能专有名词/缩写/新词/乱打）

代码示例：

import re
from collections import Counter
from spellchecker import SpellChecker
from wordfreq import zipf_frequency

spell = SpellChecker(language="en")

# 只处理英文 token：字母 + 连字符/撇号（phase-locked, don't）
WORD_RE = re.compile(r"[A-Za-z]+(?:[-'][A-Za-z]+)*")

VOWELS = set("aeiou")

# 技术词形豁免：缩写/含数字/连字符复合/驼峰等（避免误杀学术输入）
TECH_OK_RE = re.compile(r"""
^(
  [A-Z]{2,10} |                         # EEG, BCI, LLM
  [A-Za-z]+[-_][A-Za-z0-9]+ |            # phase-locked, tms_eeg
  [A-Za-z]*\d+[A-Za-z0-9-]* |            # GPT4, 3D, BERT-base
  [A-Za-z]+[A-Z][A-Za-z0-9]*             # CamelCase: OpenAI, ChatGPT
)$
""", re.VERBOSE)

def is_gibberish_shape(tok: str) -> bool:
    """
    形态学乱打检测：不依赖词典，专抓 asdfa/qwrty 这类。
    只作为风险信号，不做拼写结论。
    """
    t = tok.lower()

    # 超长纯字母串通常可疑（但研究输入里也可能出现非常长术语；这里先保守）
    if len(t) >= 25:
        return True

    # 4+ 连续重复字符：aaaa
    if re.search(r"(.)\1{3,}", t):
        return True

    # 长辅音串
    if re.search(r"[bcdfghjklmnpqrstvwxyz]{6,}", t):
        return True

    # 元音比例过低（长度>=7才判断）
    if len(t) >= 7:
        vr = sum(c in VOWELS for c in t) / len(t)
        if vr < 0.20:
            return True

    # 字符多样性过低（长度>=7才判断）
    if len(t) >= 7 and (len(set(t)) / len(t) < 0.35):
        return True

    return False

def classify_word_en(tok: str) -> str:
    """
    返回：correct / misspelled / unknown
    """
    w = tok.strip()
    if not WORD_RE.fullmatch(w):
        return "unknown"  # 理论上不会进来

    # 1) 技术词形豁免
    if TECH_OK_RE.match(w):
        return "correct"

    wl = w.lower()

    # 2) 高频词直接判 correct（减少误判与计算）
    if zipf_frequency(wl, "en") >= 3.0:
        return "correct"

    # 3) 词典命中
    if wl in spell:
        return "correct"

    # 4) 纠错候选：只有候选“高频”才判 misspelled（避免专有名词被误判）
    cand = spell.correction(wl)
    if cand and cand != wl:
        if zipf_frequency(cand, "en") >= 3.0:
            return "misspelled"

    return "unknown"

def repeated_word_trigrams(tokens_lower):
    """
    计算重复的词三元组数量（出现>=2次的 trigram 个数）
    """
    if len(tokens_lower) < 3:
        return 0
    trigrams = [tuple(tokens_lower[i:i+3]) for i in range(len(tokens_lower)-2)]
    c = Counter(trigrams)
    return sum(1 for _, v in c.items() if v >= 2)

def analyze_english_text(text: str) -> dict:
    """
    输出：
    - correct_ratio / misspelled_ratio / unknown_ratio
    - gibberish_token_ratio
    - repetition metrics
    - recommended_illegal (用于第一阶段非法输入判定)
    """
    tokens = WORD_RE.findall(text)
    tokens_lower = [t.lower() for t in tokens]

    total = len(tokens)
    if total == 0:
        return {
            "total_words": 0,
            "correct_ratio": 1.0,
            "misspelled_ratio": 0.0,
            "unknown_ratio": 0.0,
            "gibberish_token_ratio": 0.0,
            "unique_token_ratio": 1.0,
            "repeated_token_ratio": 0.0,
            "repeated_word_trigrams": 0,
            "recommended_illegal": True,  # 无内容通常不放行
            "reason": "no_english_tokens"
        }

    counts = {"correct": 0, "misspelled": 0, "unknown": 0}
    gib = 0

    for t in tokens:
        cls = classify_word_en(t)
        counts[cls] += 1
        if is_gibberish_shape(t):
            gib += 1

    correct_ratio = counts["correct"] / total
    misspelled_ratio = counts["misspelled"] / total
    unknown_ratio = counts["unknown"] / total
    gib_ratio = gib / total

    # repetition
    tok_counts = Counter(tokens_lower)
    unique = len(tok_counts)
    unique_token_ratio = unique / total
    repeated_token_ratio = sum(1 for _, v in tok_counts.items() if v >= 2) / unique
    trigram_repeats = repeated_word_trigrams(tokens_lower)

    # --- 非法输入判定（建议规则，可调参）---
    # 针对 asdfa adsfa ... 这种：
    # 1) 大部分 token 形态可疑 (gib_ratio高) 或 拼写错误比例高 (misspelled高)
    # 2) 同时存在明显重复（unique_ratio低 或 trigram重复）
    recommended_illegal = False
    reason = "ok"

    if total >= 10:
        if (gib_ratio >= 0.60 or misspelled_ratio >= 0.40) and (
            unique_token_ratio <= 0.65 or repeated_token_ratio >= 0.25 or trigram_repeats >= 1
        ):
            recommended_illegal = True
            reason = "gibberish_or_misspelled_with_repetition"

    return {
        "total_words": total,
        "correct_ratio": round(correct_ratio, 3),
        "misspelled_ratio": round(misspelled_ratio, 3),
        "unknown_ratio": round(unknown_ratio, 3),
        "gibberish_token_ratio": round(gib_ratio, 3),
        "unique_token_ratio": round(unique_token_ratio, 3),
        "repeated_token_ratio": round(repeated_token_ratio, 3),
        "repeated_word_trigrams": trigram_repeats,
        "recommended_illegal": recommended_illegal,
        "reason": reason,
        "counts": counts,
    }

# Demo
if __name__ == "__main__":
    s = "asdfa adsfa asdf d jlj joee jojljo ejoefef jeoe eojeoej ejon asdfa adsfa asdf d jlj joee jojljo ejoefef jeoe eojeoej ejo"
    print(analyze_english_text(s))

出现下列问题之一就认为非法输入：
 - gibberish_token_ratio >= 0.60：基本可以视为乱打
 - misspelled_ratio >= 0.40：大量拼写错
 - unique_token_ratio <= 0.65 或 repeated_token_ratio >= 0.25：明显重复
 - repeated_word_trigrams >= 1：出现重复词三元组（很强信号）

 