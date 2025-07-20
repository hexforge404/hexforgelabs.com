import subprocess

async def get_docker_info():
    try:
        output = subprocess.check_output(["docker", "info"], text=True)
        return {"output": output}
    except subprocess.CalledProcessError as e:
        return {"error": e.output}
    except Exception as e:
        return {"error": str(e)}
