import os
import subprocess
import json


def _docker_tools_enabled() -> bool:
    flag = os.getenv("ENABLE_DOCKER_TOOLS", "false").strip().lower()
    return flag in {"1", "true", "yes", "on"}


def _docker_disabled_response():
    return {
        "ok": False,
        "error": "Docker tools are disabled by ENABLE_DOCKER_TOOLS",
        "code": "DOCKER_TOOLS_DISABLED",
    }


async def get_docker_info():
    """
    Return Docker information in a safe, user-friendly JSON format.
    Uses `docker info` via the host socket. If Docker is unavailable,
    returns a clean error instead of a traceback.
    """
    if not _docker_tools_enabled():
        return _docker_disabled_response()

    try:
        result = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return {
                "ok": False,
                "error": "Docker command returned an error.",
                "code": result.returncode,
                "stderr": result.stderr.strip(),
            }

        return {
            "ok": True,
            "info": result.stdout.strip(),
        }

    except FileNotFoundError:
        return {
            "ok": False,
            "error": (
                "Docker CLI not found inside assistant container. "
                "Rebuild the assistant image with docker.io installed."
            ),
        }
    except Exception as e:
        return {
            "ok": False,
            "error": f"Unexpected error calling docker: {str(e)}",
        }


async def docker_ps():
    """
    Return a structured list of running containers using `docker ps`.
    Each container is a JSON object so the UI can render it nicely.
    """
    if not _docker_tools_enabled():
        return _docker_disabled_response()

    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{json .}}"],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return {
                "ok": False,
                "error": "docker ps returned an error.",
                "code": result.returncode,
                "stderr": result.stderr.strip(),
            }

        containers: list[dict] = []
        for line in result.stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                containers.append(json.loads(line))
            except json.JSONDecodeError:
                # Fallback: raw line if parsing fails
                containers.append({"raw": line})

        return {"ok": True, "containers": containers}

    except FileNotFoundError:
        return {
            "ok": False,
            "error": (
                "Docker CLI not found inside assistant container. "
                "Rebuild the assistant image with docker.io installed."
            ),
        }
    except Exception as e:
        return {
            "ok": False,
            "error": f"Unexpected error calling docker ps: {str(e)}",
        }
