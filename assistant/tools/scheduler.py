import time
from threading import Timer, Thread
from datetime import datetime
from .core import save_memory_entry

async def delay_response(seconds):
    """Delays a response for a set number of seconds (blocking)."""
    try:
        time.sleep(seconds)
        result = {"status": f"Waited {seconds} seconds.", "retry": False}
    except Exception as e:
        result = {"error": str(e), "retry": True}
    await save_memory_entry("delay-response", result)
    return result

async def schedule_callback(func, delay_seconds, *args, **kwargs):
    """Schedules a callback function to run once after delay (non-blocking)."""
    try:
        timer = Timer(delay_seconds, func, args=args, kwargs=kwargs)
        timer.start()
        result = {"status": f"Scheduled function `{func.__name__}` in {delay_seconds} seconds."}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("schedule-callback", result)
    return result

async def time_now():
    """Returns the current date and time."""
    try:
        now = datetime.now()
        result = {"datetime": now.strftime("%Y-%m-%d %H:%M:%S")}
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("time-now", result)
    return result

async def measure_runtime(func, *args, **kwargs):
    """Measures the time it takes to run a function."""
    try:
        start = time.perf_counter()
        result_value = func(*args, **kwargs)
        end = time.perf_counter()
        elapsed = round(end - start, 4)
        result = {
            "elapsed_seconds": elapsed,
            "function": func.__name__,
            "result": result_value
        }
    except Exception as e:
        result = {"error": str(e)}
    await save_memory_entry("measure-runtime", result)
    return result
