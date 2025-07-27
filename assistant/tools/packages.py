import subprocess
from .core import save_memory_entry

async def list_installed_packages():
    """Lists installed Python packages using pip."""
    try:
        output = subprocess.check_output(["pip", "list"], text=True)
        result = {"packages": output, "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("list-packages", result)
    return result

async def show_package_info(package_name):
    """Returns detailed info about a specific installed package."""
    try:
        output = subprocess.check_output(["pip", "show", package_name], text=True)
        result = {"package": package_name, "info": output}
    except subprocess.CalledProcessError:
        result = {"error": f"Package '{package_name}' not found."}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("show-package-info", result)
    return result

async def install_package(package_name):
    """Attempts to install a package using pip."""
    try:
        output = subprocess.check_output(["pip", "install", package_name], stderr=subprocess.STDOUT, text=True)
        result = {"installed": package_name, "output": output}
    except subprocess.CalledProcessError as e:
        result = {"error": e.output, "retry": True}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("install-package", result)
    return result

async def uninstall_package(package_name):
    """Attempts to uninstall a package using pip."""
    try:
        output = subprocess.check_output(["pip", "uninstall", "-y", package_name], stderr=subprocess.STDOUT, text=True)
        result = {"uninstalled": package_name, "output": output}
    except subprocess.CalledProcessError as e:
        result = {"error": e.output, "retry": True}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("uninstall-package", result)
    return result
async def upgrade_package(package_name):
    """Attempts to upgrade a package using pip."""
    try:
        output = subprocess.check_output(["pip", "install", "--upgrade", package_name], stderr=subprocess.STDOUT, text=True)
        result = {"upgraded": package_name, "output": output}
    except subprocess.CalledProcessError as e:
        result = {"error": e.output, "retry": True}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("upgrade-package", result)
    return result
async def check_package_updates():
    """Checks for available updates for installed packages using pip."""
    try:
        output = subprocess.check_output(["pip", "list", "--outdated"], text=True)
        result = {"updates": output.strip().split("\n")[2:], "retry": False}
    except subprocess.CalledProcessError as e:
        result = {"error": e.output, "retry": True}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-package-updates", result)
    return result
async def list_package_files(package_name):
    """Lists files installed by a specific package."""
    try:
        output = subprocess.check_output(["pip", "show", "-f", package_name], text=True)
        result = {"package": package_name, "files": output}
    except subprocess.CalledProcessError:
        result = {"error": f"Package '{package_name}' not found."}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("list-package-files", result)
    return result
async def check_package_version(package_name):
    """Checks the version of a specific installed package."""
    try:
        output = subprocess.check_output(["pip", "show", package_name], text=True)
        for line in output.splitlines():
            if line.startswith("Version:"):
                version = line.split(":")[1].strip()
                result = {"package": package_name, "version": version}
                break
        else:
            result = {"error": f"Package '{package_name}' not found."}
    except subprocess.CalledProcessError:
        result = {"error": f"Package '{package_name}' not found."}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-package-version", result)
    return result
async def check_package_dependencies(package_name):
    """Checks the dependencies of a specific installed package."""
    try:
        output = subprocess.check_output(["pip", "show", package_name], text=True)
        dependencies = []
        for line in output.splitlines():
            if line.startswith("Requires:"):
                dependencies = line.split(":")[1].strip().split(", ")
                break
        result = {"package": package_name, "dependencies": dependencies}
    except subprocess.CalledProcessError:
        result = {"error": f"Package '{package_name}' not found."}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-package-dependencies", result)
    return result
async def check_package_license(package_name):
    """Checks the license of a specific installed package."""
    try:
        output = subprocess.check_output(["pip", "show", package_name], text=True)
        for line in output.splitlines():
            if line.startswith("License:"):
                license_info = line.split(":")[1].strip()
                result = {"package": package_name, "license": license_info}
                break
        else:
            result = {"error": f"Package '{package_name}' not found."}
    except subprocess.CalledProcessError:
        result = {"error": f"Package '{package_name}' not found."}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-package-license", result)
    return result
async def check_package_homepage(package_name):
    """Checks the homepage of a specific installed package."""
    try:
        output = subprocess.check_output(["pip", "show", package_name], text=True)
        for line in output.splitlines():
            if line.startswith("Home-page:"):
                homepage = line.split(":")[1].strip()
                result = {"package": package_name, "homepage": homepage}
                break
        else:
            result = {"error": f"Package '{package_name}' not found."}
    except subprocess.CalledProcessError:
        result = {"error": f"Package '{package_name}' not found."}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-package-homepage", result)
    return result
async def check_package_summary(package_name):
    """Checks the summary of a specific installed package."""
    try:
        output = subprocess.check_output(["pip", "show", package_name], text=True)
        for line in output.splitlines():
            if line.startswith("Summary:"):
                summary = line.split(":")[1].strip()
                result = {"package": package_name, "summary": summary}
                break
        else:
            result = {"error": f"Package '{package_name}' not found."}
    except subprocess.CalledProcessError:
        result = {"error": f"Package '{package_name}' not found."}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-package-summary", result)
    return result
async def check_package_author(package_name):
    """Checks the author of a specific installed package."""
    try:
        output = subprocess.check_output(["pip", "show", package_name], text=True)
        for line in output.splitlines():
            if line.startswith("Author:"):
                author = line.split(":")[1].strip()
                result = {"package": package_name, "author": author}
                break
        else:
            result = {"error": f"Package '{package_name}' not found."}
    except subprocess.CalledProcessError:
        result = {"error": f"Package '{package_name}' not found."}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("check-package-author", result)
    return result