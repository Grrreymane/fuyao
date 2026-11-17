"""Swap top-level JS functions in FILE with the same-named ones in NEWCODE.

usage: python3 replace_fn.py FILE NEWCODE.js

NEWCODE.js holds complete top-level `function NAME(...) {...}` definitions (top-level comments are not allowed,
put them inside the function). Each replaces the same-named function in FILE, spanning from its `function NAME(`
line to the next top-level declaration. Names not present in FILE are inserted before the first replaced one.
A line `//@remove NAME` deletes that function from FILE.
"""
import re
import sys

TOP = re.compile(r"^(?:function |const |let |/\* -)", re.M)


def span(text: str, name: str):
    m = re.search(r"^function " + re.escape(name) + r"\(", text, re.M)
    if not m:
        return None
    nxt = TOP.search(text, m.end())
    return m.start(), (nxt.start() if nxt else len(text))


def main() -> None:
    path, newp = sys.argv[1], sys.argv[2]
    src = open(path, encoding="utf-8").read()
    new = open(newp, encoding="utf-8").read()
    for name in re.findall(r"^//@remove (\w+)$", new, re.M):
        s = span(src, name)
        if not s:
            sys.exit(f"remove: {name} not found")
        src = src[:s[0]] + src[s[1]:]
        print("removed", name)
    new = re.sub(r"^//@remove \w+\n", "", new, flags=re.M)
    heads = [(m.group(1), m.start()) for m in re.finditer(r"^function (\w+)\(", new, re.M)]
    first = None
    for k, (name, st) in enumerate(heads):
        en = heads[k + 1][1] if k + 1 < len(heads) else len(new)
        body = new[st:en].rstrip("\n") + "\n"
        s = span(src, name)
        if s:
            src = src[:s[0]] + body + src[s[1]:]
            first = first or name
            print("replaced", name)
        else:
            a = span(src, first) if first else None
            pos = a[0] if a else len(src)
            src = src[:pos] + body + src[pos:]
            print("inserted", name)
    open(path, "w", encoding="utf-8").write(src)


if __name__ == "__main__":
    main()
