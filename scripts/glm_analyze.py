"""
glm_analyze.py — 用 GLM-4V 分析微信小游戏截图
用法:
  python scripts/glm_analyze.py <screenshot_path> [--prompt "自定义提示"]
  python scripts/glm_analyze.py img1.png img2.png img3.png [--burst]

单张图输出:
{
  "screen_type": "menu|level_select|pre_level|game|fail|complete|shop|gallery|intro|unknown",
  "visible_elements": ["列出所有可见UI元素"],
  "text_content": ["截图中的文字内容"],
  "visual_issues": ["任何视觉问题，无则空数组"],
  "is_loading": false,
  "confidence": "high|medium|low"
}

多张图（--burst）输出:
{
  "animation_issues": ["帧间动画问题"],
  "frame_summary": ["每帧简短描述"],
  "confidence": "high|medium|low"
}

GLM_API_KEY 优先级: 环境变量 GLM_API_KEY → backend/.env → 内置值（仅开发用）
模型优先级: glm-4v-flash (免费) → glm-4v → glm-4v-plus
"""
import sys, os, json, base64, argparse, re

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

try:
    import requests
except ImportError:
    print(json.dumps({"error": "缺少 requests 库，运行: pip install requests"}))
    sys.exit(1)

# ─── 参数 ───────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument('images', nargs='+', help='截图路径（一张或多张）')
parser.add_argument('--prompt', type=str, default=None, help='自定义分析提示（可选）')
parser.add_argument('--model', type=str, default=None, help='指定 GLM 模型（可选）')
parser.add_argument('--burst', action='store_true', help='多帧动画分析模式，输出 animation_issues')
args = parser.parse_args()

for img in args.images:
    if not os.path.exists(img):
        print(json.dumps({"error": f"文件不存在: {img}"}))
        sys.exit(1)

# ─── API Key 读取 ────────────────────────────────
def load_api_key():
    # 1. 环境变量
    key = os.getenv('GLM_API_KEY')
    if key:
        return key
    # 2. backend/.env
    env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
    env_path = os.path.normpath(env_path)
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('GLM_API_KEY='):
                    return line.split('=', 1)[1].strip()
    # 3. 内置（仅开发环境）
    return "76abfcaf43fe465a8faa15d66b1524ab.uaevFFL3CQiy8vjv"

GLM_API_KEY = load_api_key()
GLM_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
VISION_MODELS = ["glm-4v-flash", "glm-4v", "glm-4v-plus"]

# ─── 默认提示 ────────────────────────────────────
DEFAULT_PROMPT = """分析这张微信小游戏（追星少女/StarCatcher）截图，返回 JSON（不要 markdown 代码块）：
{
  "screen_type": "menu（主菜单）|level_select（选关）|pre_level（关卡前道具选择）|game（游戏中）|fail（失败）|complete（通关）|shop（商店/道具）|gallery（图鉴）|intro（片头动画）|achievement（成就）|settings（设置）|unknown",
  "visible_elements": ["所有可见UI元素，如按钮、图标、文字标签"],
  "text_content": ["截图中出现的文字内容"],
  "visual_issues": ["发现的视觉问题（如文字截断、元素重叠、图标缺失），无则空数组"],
  "is_loading": false,
  "confidence": "high（确定）|medium（基本确定）|low（不确定）"
}"""

BURST_PROMPT_TEMPLATE = ("这是游戏动画的{n}帧连续截图（100ms间隔）。"
    "请分析帧间差异，仅返回JSON（不要markdown代码块）：\n"
    '{"animation_issues":["帧间发现的动画问题列表，如闪烁、穿帮、角色消失等，无则空数组"],'
    '"frame_summary":["每帧的简短描述"],'
    '"confidence":"high|medium|low"}')

# ─── 编码图像 ────────────────────────────────────
def encode_image(path):
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode()

models_to_try = [args.model] if args.model else VISION_MODELS

# ─── 调用 GLM-4V ─────────────────────────────────
def call_glm_vision(model, content_list):
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": content_list}],
        "max_tokens": 512,
        "temperature": 0.1
    }
    r = requests.post(
        GLM_API_URL,
        headers={"Authorization": f"Bearer {GLM_API_KEY}", "Content-Type": "application/json"},
        json=payload,
        timeout=60
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]

def parse_json_response(raw):
    """从 GLM 响应中提取 JSON，容忍 markdown 代码块"""
    text = raw.strip()
    # 去掉 ```json ... ``` 或 ``` ... ```
    m = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if m:
        text = m.group(1).strip()
    return json.loads(text)

# ─── 构建 content list ────────────────────────────
if args.burst or len(args.images) > 1:
    # Multi-image burst mode
    content = []
    for img_path in args.images:
        b64 = encode_image(img_path)
        content.append({"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}})
    burst_prompt = args.prompt if args.prompt else BURST_PROMPT_TEMPLATE.format(n=len(args.images))
    content.append({"type": "text", "text": burst_prompt})
else:
    # Single image mode
    b64 = encode_image(args.images[0])
    prompt_text = args.prompt if args.prompt else DEFAULT_PROMPT
    content = [
        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
        {"type": "text", "text": prompt_text}
    ]

last_error = None
for model in models_to_try:
    try:
        raw = call_glm_vision(model, content)
        result = parse_json_response(raw)
        result["_model_used"] = model
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0)
    except requests.HTTPError as e:
        last_error = f"HTTP {e.response.status_code}: {e.response.text[:200]}"
    except json.JSONDecodeError as e:
        # 解析失败，直接返回原始响应
        fallback = {
            "confidence": "low",
            "_model_used": model,
            "_raw_response": raw[:500]
        }
        if args.burst or len(args.images) > 1:
            fallback["animation_issues"] = []
            fallback["frame_summary"] = []
        else:
            fallback.update({"screen_type": "unknown", "visible_elements": [],
                             "text_content": [], "visual_issues": [], "is_loading": False})
        print(json.dumps(fallback, ensure_ascii=False, indent=2))
        sys.exit(0)
    except Exception as e:
        last_error = str(e)

print(json.dumps({"error": f"所有模型均失败: {last_error}"}), file=sys.stderr)
sys.exit(1)
