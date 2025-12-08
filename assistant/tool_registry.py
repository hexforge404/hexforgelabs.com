# assistant/tool_registry.py

TOOL_REGISTRY = []


def register_tool(name, label, category="General", method="GET"):
    """
    Decorator used by tool modules to register themselves.

    Example:
        @register_tool("get_os_info", "Get OS info", category="System")
        def get_os_info():
            ...
    """
    def decorator(func):
        TOOL_REGISTRY.append(
            {
                "name": name,
                "label": label,
                "category": category,
                "method": method,
                "func": func,
            }
        )
        return func

    return decorator
