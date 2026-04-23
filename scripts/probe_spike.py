"""
SPIKE 可行性探针 — 四项测试
1. hwnd 自动发现（不硬编码）
2. mss 截图 + 非全黑验证
3. GLM-4V 图像分析（base64 图像）
4. GLM web_search 工具
"""
import ctypes, ctypes.wintypes, time, os, sys, json, base64, subprocess, struct
import mss, mss.tools
import requests
from PIL import Image
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

GLM_API_KEY = "76abfcaf43fe465a8faa15d66b1524ab.uaevFFL3CQiy8vjv"
GLM_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
OUT_DIR = "docs/spike-results"
os.makedirs(OUT_DIR, exist_ok=True)

user32 = ctypes.windll.user32
results = {}

# ─────────────────────────────────────────────
# TEST 1: hwnd 自动发现
# ─────────────────────────────────────────────
print("\n[TEST 1] hwnd 自动发现...")

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
found_hwnds = []

def enum_callback(hwnd, lparam):
    if not user32.IsWindowVisible(hwnd):
        return True
    pid = ctypes.wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    try:
        proc = subprocess.run(
            ['tasklist', '/FI', f'PID eq {pid.value}', '/FO', 'CSV', '/NH'],
            capture_output=True, text=True, timeout=2, encoding='utf-8', errors='ignore'
        )
        if 'wechatdevtools' in proc.stdout.lower():
            title_buf = ctypes.create_unicode_buffer(256)
            user32.GetWindowTextW(hwnd, title_buf, 256)
            if title_buf.value:
                found_hwnds.append((hwnd, title_buf.value))
    except Exception:
        pass
    return True

user32.EnumWindows(WNDENUMPROC(enum_callback), 0)

if found_hwnds:
    hwnd, title = found_hwnds[0]
    results["hwnd_discovery"] = {"status": "OK", "hwnd": hwnd, "title": title}
    print(f"  ✓ 发现 hwnd={hwnd}, 标题='{title}'")
else:
    results["hwnd_discovery"] = {"status": "FAIL", "error": "未找到 wechatdevtools 窗口"}
    print("  ✗ 未找到 WeChat DevTools 窗口")
    print("  请确认微信开发者工具已打开")
    hwnd = None

# ─────────────────────────────────────────────
# TEST 2: mss 截图 + 非全黑验证
# ─────────────────────────────────────────────
print("\n[TEST 2] mss 截图 + 非全黑验证...")

screenshot_path = f"{OUT_DIR}/probe-screenshot.png"
screenshot_ok = False

if hwnd:
    class RECT(ctypes.Structure):
        _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long),
                    ("right", ctypes.c_long), ("bottom", ctypes.c_long)]

    # 前台显示
    user32.ShowWindow(hwnd, 9)  # SW_RESTORE
    user32.SetForegroundWindow(hwnd)
    time.sleep(1.5)

    r = RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(r))
    wx, wy = r.left, r.top
    ww = r.right - r.left
    wh = r.bottom - r.top
    print(f"  DevTools 窗口: ({wx},{wy}) {ww}x{wh}")

    # 推算模拟器区域（保守比例）
    sim_x = int(wx + ww * 0.71)
    sim_y = int(wy + wh * 0.08)
    sim_w = int(ww * 0.27)
    sim_h = int(wh * 0.78)
    print(f"  模拟器估算区域: ({sim_x},{sim_y}) {sim_w}x{sim_h}")

    for attempt in range(3):
        with mss.mss() as sct:
            region = {"top": sim_y, "left": sim_x, "width": sim_w, "height": sim_h}
            img = sct.grab(region)
            mss.tools.to_png(img.rgb, img.size, output=screenshot_path)

        pil = Image.open(screenshot_path).convert('RGB')
        arr = np.array(pil)
        brightness = arr.mean()
        print(f"  尝试 {attempt+1}: 亮度={brightness:.1f}")

        if brightness > 10:
            screenshot_ok = True
            results["mss_screenshot"] = {
                "status": "OK",
                "path": screenshot_path,
                "brightness": round(float(brightness), 1),
                "size": f"{img.width}x{img.height}"
            }
            print(f"  ✓ 截图成功: {screenshot_path} ({img.width}x{img.height})")
            break
        else:
            print(f"  全黑，等待 2s 重试...")
            time.sleep(2)

    if not screenshot_ok:
        results["mss_screenshot"] = {"status": "FAIL", "error": "3次全部全黑"}
        print("  ✗ 截图失败: 3次全部全黑")
else:
    results["mss_screenshot"] = {"status": "SKIP", "reason": "hwnd未找到"}
    print("  跳过（hwnd未找到）")

# ─────────────────────────────────────────────
# TEST 3: GLM-4V 图像分析
# ─────────────────────────────────────────────
print("\n[TEST 3] GLM-4V 图像分析...")

glm_vision_ok = False
vision_models = ["glm-4v", "glm-4v-plus", "glm-4v-flash"]

# 如果截图失败，用一张简单测试图
test_image = screenshot_path if screenshot_ok else None
if not test_image or not os.path.exists(test_image):
    # 创建一张简单的测试图
    test_image = f"{OUT_DIR}/probe-test-image.png"
    img = Image.new('RGB', (100, 100), color=(100, 150, 200))
    img.save(test_image)
    print(f"  使用占位测试图: {test_image}")

with open(test_image, "rb") as f:
    b64 = base64.b64encode(f.read()).decode()

for model in vision_models:
    print(f"  尝试模型: {model}")
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                    {"type": "text", "text": '描述这张图片，返回JSON: {"screen_type": "...", "description": "..."}'}
                ]
            }
        ],
        "max_tokens": 256,
        "temperature": 0.1
    }
    try:
        r = requests.post(
            GLM_API_URL,
            headers={"Authorization": f"Bearer {GLM_API_KEY}", "Content-Type": "application/json"},
            json=payload,
            timeout=60
        )
        if r.status_code == 200:
            content = r.json()["choices"][0]["message"]["content"]
            results["glm_4v"] = {"status": "OK", "model": model, "response": content[:200]}
            print(f"  ✓ GLM-4V 成功 (模型: {model})")
            print(f"  响应: {content[:200]}")
            glm_vision_ok = True
            break
        else:
            err = r.text[:200]
            print(f"  HTTP {r.status_code}: {err}")
            results[f"glm_4v_{model}"] = {"status": "FAIL", "code": r.status_code, "error": err}
    except Exception as e:
        print(f"  异常: {e}")
        results[f"glm_4v_{model}"] = {"status": "FAIL", "error": str(e)}

if not glm_vision_ok:
    results["glm_4v"] = {"status": "FAIL", "error": "所有视觉模型均失败"}
    print("  ✗ GLM-4V 不可用（所有模型均失败）")

# ─────────────────────────────────────────────
# TEST 4: GLM web_search 工具
# ─────────────────────────────────────────────
print("\n[TEST 4] GLM web_search 工具...")

payload = {
    "model": "glm-4-flash",
    "messages": [{"role": "user", "content": "微信小游戏 Canvas 截图 Python 2024，返回一句话总结"}],
    "tools": [{"type": "web_search", "web_search": {"enable": True, "search_result": True}}],
    "max_tokens": 512
}
try:
    r = requests.post(
        GLM_API_URL,
        headers={"Authorization": f"Bearer {GLM_API_KEY}", "Content-Type": "application/json"},
        json=payload,
        timeout=60
    )
    if r.status_code == 200:
        data = r.json()
        content = data["choices"][0]["message"]["content"]
        tool_calls = data["choices"][0]["message"].get("tool_calls", [])
        results["glm_web_search"] = {
            "status": "OK",
            "has_tool_calls": len(tool_calls) > 0,
            "response_preview": content[:200]
        }
        print(f"  ✓ web_search 成功, tool_calls={len(tool_calls)}")
        print(f"  响应: {content[:200]}")
    else:
        results["glm_web_search"] = {"status": "FAIL", "code": r.status_code, "error": r.text[:200]}
        print(f"  ✗ HTTP {r.status_code}: {r.text[:200]}")
except Exception as e:
    results["glm_web_search"] = {"status": "FAIL", "error": str(e)}
    print(f"  ✗ 异常: {e}")

# ─────────────────────────────────────────────
# 总结
# ─────────────────────────────────────────────
print("\n" + "="*50)
print("探针测试总结:")
for k, v in results.items():
    status = v.get("status", "?")
    icon = "✓" if status == "OK" else ("⊘" if status == "SKIP" else "✗")
    print(f"  {icon} {k}: {status}")

viable = (
    results.get("hwnd_discovery", {}).get("status") == "OK" and
    results.get("mss_screenshot", {}).get("status") == "OK" and
    results.get("glm_4v", {}).get("status") == "OK"
)
print(f"\n整体可行性: {'VIABLE ✓' if viable else 'NEEDS INVESTIGATION ⚠'}")

# 写结果文件
with open(f"{OUT_DIR}/probe-results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"\n详细结果: {OUT_DIR}/probe-results.json")
if screenshot_ok:
    print(f"截图文件: {screenshot_path}")
