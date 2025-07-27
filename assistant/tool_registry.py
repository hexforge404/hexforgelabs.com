# assistant/tool_registry.py

TOOL_REGISTRY = []

def register_tool(name, label, category="General", method="GET"):
    def decorator(func):
        TOOL_REGISTRY.append({
            "name": name,
            "label": label,
            "category": category,
            "method": method
        })
        return func
    return decorator
                        