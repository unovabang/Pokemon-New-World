# -*- coding: utf-8 -*-
"""Extract BST data from HTML files (Excel/Google Sheets export)"""
import re
import json
import glob
import os

def extract_table(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()
    tbody = re.search(r'<tbody>(.*?)</tbody>', html, re.DOTALL)
    if not tbody:
        return []
    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', tbody.group(1), re.DOTALL)
    result = []
    for i, row in enumerate(rows):
        cells = re.findall(r'<t[dh][^>]*>([^<]*)</t[dh]>', row)
        cells = [c.strip().replace('\n', ' ').replace('\r', '') for c in cells]
        if i == 0:
            continue
        if not any(cells):
            continue
        result.append(cells)
    return result

def parse_fakemon(rows):
    """Fakemon: col2=Nom, col3=Type, col4-9=stats, col10=Total, col11=Talent, col12=Desc"""
    out = []
    for r in rows:
        if len(r) < 11:
            continue
        nom = r[2] if len(r) > 2 and r[2] and not r[2].replace('/', '').isdigit() else (r[1] if len(r) > 1 and r[1] else '')
        if not nom or nom in ('Nom', 'Sprite'):
            continue
        out.append({
            'name': nom,
            'type': r[3] if len(r) > 3 else '',
            'hp': r[4] if len(r) > 4 else '',
            'atk': r[5] if len(r) > 5 else '',
            'def': r[6] if len(r) > 6 else '',
            'spa': r[7] if len(r) > 7 else '',
            'spd': r[8] if len(r) > 8 else '',
            'spe': r[9] if len(r) > 9 else '',
            'total': r[10] if len(r) > 10 else '',
            'ability': r[11] if len(r) > 11 else '',
            'abilityDesc': r[12] if len(r) > 12 else ''
        })
    return out

def parse_megas(rows):
    """Nouvelles Megas: col2=Nom, col3=Type, etc."""
    return parse_fakemon(rows)

def parse_speciaux(rows):
    """Pokemons Speciaux: col2=Nom, col3=Type, etc. (no abilityDesc)"""
    out = []
    for r in rows:
        if len(r) < 10:
            continue
        nom = r[2] if len(r) > 2 and r[2] else ''
        if not nom or nom in ('Nom', 'Sprite'):
            continue
        out.append({
            'name': nom,
            'type': r[3] if len(r) > 3 else '',
            'hp': r[4] if len(r) > 4 else '',
            'atk': r[5] if len(r) > 5 else '',
            'def': r[6] if len(r) > 6 else '',
            'spa': r[7] if len(r) > 7 else '',
            'spd': r[8] if len(r) > 8 else '',
            'spe': r[9] if len(r) > 9 else '',
            'total': r[10] if len(r) > 10 else '',
            'ability': r[11] if len(r) > 11 else '',
            'abilityDesc': ''
        })
    return out

def main():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(base)

    data = {}

    # Fakemon + Formes Régionales
    fakemon_files = glob.glob('Fakemon*')
    if fakemon_files:
        rows = extract_table(fakemon_files[0])
        data['fakemon'] = parse_fakemon(rows)
        print(f"Fakemon: {len(data['fakemon'])} entries")

    # Nouvelles Mégas
    megas_files = glob.glob('Nouvelles*')
    if megas_files:
        rows = extract_table(megas_files[0])
        data['megas'] = parse_megas(rows)
        print(f"Megas: {len(data['megas'])} entries")

    # Pokemons Spéciaux
    speciaux_files = glob.glob('Pokemons*')
    if speciaux_files:
        rows = extract_table(speciaux_files[0])
        data['speciaux'] = parse_speciaux(rows)
        print(f"Speciaux: {len(data['speciaux'])} entries")

    out_path = os.path.join(base, 'src', 'config', 'bst.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved to {out_path}")

if __name__ == '__main__':
    main()
