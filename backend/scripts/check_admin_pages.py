import asyncio
import sys

sys.stdout.reconfigure(encoding="utf-8")
from playwright.async_api import async_playwright

TEST_ROUTES = [
    "/",
    "/about",
    "/admin/login",
    "/admin/dashboard",
    "/admin/events",
    "/admin/teams",
    "/admin/sessions",
    "/admin/results",
    "/admin/settings",
    "/team/login",
    "/team/dashboard",
    "/team/submission",
    "/team/session",
]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        total_issues = 0
        print("=" * 60)
        print("AINIREEKSHAK COMPREHENSIVE UI & ERROR VERIFICATION")
        print("=" * 60)

        for route in TEST_ROUTES:
            errors = []
            page_errors = []

            def on_page_err(err):
                msg = str(err)
                page_errors.append(msg)

            def on_console(msg):
                if msg.type == "error":
                    errors.append(msg.text)

            page.on("pageerror", on_page_err)
            page.on("console", on_console)

            url = f"http://localhost:3000{route}"
            print(f"Testing route: {route:<20} -> ", end="", flush=True)

            try:
                response = await page.goto(url, wait_until="domcontentloaded", timeout=10000)
                await page.wait_for_timeout(1000)

                status = response.status if response else "NO_RESP"

                # Filter out intentional 401/404 fetch errors if unauthenticated
                runtime_crashes = [
                    e for e in (page_errors + errors)
                    if "typeerror" in e.lower() or "map is not a function" in e.lower() or "referenceerror" in e.lower() or "syntaxerror" in e.lower()
                ]

                if status == 200 and len(runtime_crashes) == 0:
                    print(f"PASS (Status: {status}, 0 Crashes)")
                else:
                    print(f"FAIL (Status: {status}, Crashes: {len(runtime_crashes)})")
                    for c in runtime_crashes:
                        print(f"    - {c}")
                    total_issues += len(runtime_crashes)

            except Exception as ex:
                print(f"EXCEPTION: {ex}")
                total_issues += 1

            page.remove_listener("pageerror", on_page_err)
            page.remove_listener("console", on_console)

        await browser.close()
        print("=" * 60)
        print(f"VERIFICATION COMPLETE: {total_issues} Total Issues Detected.")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
