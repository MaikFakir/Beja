"""Exporta los brochures de fuentes/brochure.html a JPG (para el visor web) y PDF (descarga).
Requiere: pip install playwright && playwright install chromium
Uso (desde la carpeta del proyecto):  python fuentes/exportar_brochures.py
"""
import asyncio, pathlib
from playwright.async_api import async_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
HTML = (RAIZ / "fuentes" / "brochure.html").as_uri()
PIEZAS = {
    "Corporativo": (["corporativo-1", "corporativo-2"], False),
    "Comercial": (["comercial-1", "comercial-2"], False),
    "Ciudadano": (["ciudadano-1"], True),
}

async def main():
    (RAIZ / "assets/docs/brochure").mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--allow-file-access-from-files"])
        pg = await b.new_page(viewport={"width": 1200, "height": 900}, device_scale_factor=2)
        await pg.goto(HTML)
        await pg.wait_for_timeout(1200)
        for nombre, (ids, vertical) in PIEZAS.items():
            for i in ids:
                el = await pg.query_selector(f"#{i}")
                await el.screenshot(path=str(RAIZ / f"assets/docs/brochure/{i}.jpg"), type="jpeg", quality=88)
            ocultar = ",".join(f"#{x}" for grupo in PIEZAS.values() for x in grupo[0] if x not in ids)
            estilo = await pg.add_style_tag(content=f"{ocultar}{{display:none!important}}")
            await pg.pdf(path=str(RAIZ / f"docs/Brochure_{nombre}_Beja.pdf"), print_background=True,
                         width="210mm" if vertical else "297mm", height="297mm" if vertical else "210mm",
                         margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})
            await estilo.evaluate("n => n.remove()")
        await b.close()
    print("Brochures exportados.")

asyncio.run(main())
