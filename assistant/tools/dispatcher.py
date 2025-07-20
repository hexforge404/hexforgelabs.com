from tools.system import get_os_info, get_user
from tools.usb import list_usb_devices
from tools.logs import get_logs
from tools.docker import get_docker_info
from tools.agent import call_agent
from tools.core import save_memory_entry

tool_map = {
    "os-info": get_os_info,
    "user": get_user,
    "usb-list": list_usb_devices,
    "logs": get_logs,
    "docker": get_docker_info,
    "agent": call_agent,
}

async def tool_dispatcher(tool_name, input_data):
    if tool_name not in tool_map:
        raise ValueError(f"Unknown tool: {tool_name}")

    func = tool_map[tool_name]
    result = None
    try:
        result = await func(**input_data) if input_data else await func()
    except Exception as e:
        result = {"error": str(e)}

    # 🧠 Save memory
    await save_memory_entry({
        "tool": tool_name,
        "input": input_data,
        "result": result
    })

    return result
