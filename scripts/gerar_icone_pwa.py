#!/usr/bin/env python3
"""Gera os ícones PWA (public/icon-192.png e icon-512.png) sem dependências.

Desenha um quadrado azul com cantos arredondados e silhueta de prédio — a mesma
identidade visual do favicon do portal.
"""
import struct
import zlib
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PUBLICO = RAIZ / "public"

AZUL = (37, 99, 235, 255)      # blue-600
BRANCO = (255, 255, 255, 255)
AZUL_ESCURO = (30, 64, 175, 255)


def dentro_arredondado(x: int, y: int, n: int, raio: int) -> bool:
    if raio <= 0 or (raio <= x < n - raio) or (raio <= y < n - raio):
        return True
    cx = raio if x < raio else n - 1 - raio
    cy = raio if y < raio else n - 1 - raio
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= raio * raio


def cor_pixel(x: int, y: int, n: int) -> tuple[int, int, int, int]:
    """Silhueta: torre principal + torre menor + base, com 'janelas' vazadas."""
    u = n / 100  # unidade relativa (ícone desenhado numa grade 100x100)

    def ret(px, py, x0, y0, x1, y1) -> bool:
        return x0 * u <= px < x1 * u and y0 * u <= py < y1 * u

    # janelas da torre principal (grade vazada em azul)
    if ret(x, y, 22, 18, 58, 82):
        gx, gy = int((x - 22 * u) // (7.5 * u)), int((y - 18 * u) // (9 * u))
        if gx % 2 == 1 and gy % 2 == 0 and not ret(x, y, 22, 18, 58, 24):
            return AZUL
        return BRANCO
    if ret(x, y, 62, 36, 84, 82):
        return BRANCO
    if ret(x, y, 14, 82, 90, 88):
        return BRANCO
    return AZUL


def gerar(n: int, caminho: Path) -> None:
    raio = int(n * 0.22)
    pixels = bytearray()
    for y in range(n):
        pixels.append(0)  # filtro por linha
        for x in range(n):
            cor = cor_pixel(x, y, n) if dentro_arredondado(x, y, n, raio) else (0, 0, 0, 0)
            pixels.extend(cor)

    def chunk(tipo: bytes, dados: bytes) -> bytes:
        return (struct.pack(">I", len(dados)) + tipo + dados
                + struct.pack(">I", zlib.crc32(tipo + dados) & 0xFFFFFFFF))

    ihdr = struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0)  # RGBA
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(bytes(pixels), 9)) + chunk(b"IEND", b""))
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(png)
    print(f"  criado: {caminho.relative_to(RAIZ)} ({len(png) // 1024} kB)")


def main() -> None:
    print("Gerando ícones PWA…")
    gerar(192, PUBLICO / "icon-192.png")
    gerar(512, PUBLICO / "icon-512.png")


if __name__ == "__main__":
    main()
