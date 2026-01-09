from __future__ import annotations


def index_to_alpha(index: int) -> str:
    if index < 0:
        raise ValueError("index must be >= 0")

    out = ""
    n = index
    while True:
        n, rem = divmod(n, 26)
        out = chr(ord("A") + rem) + out
        if n == 0:
            break
        n -= 1
    return out


def alpha_to_index(s: str) -> int:
    if not s or any(c < "A" or c > "Z" for c in s):
        raise ValueError("Invalid alpha segment")

    n = 0
    for c in s:
        n = n * 26 + (ord(c) - ord("A") + 1)
    return n - 1

