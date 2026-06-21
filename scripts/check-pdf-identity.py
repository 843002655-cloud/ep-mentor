"""Check which PDF is Vol 1 vs Vol 2."""
import fitz, re
from pathlib import Path

for name in ['svt-case-book-vol1.pdf', 'svt-case-book.pdf']:
    path = Path('E:/fk claude/ep-mentor/scripts') / name
    if not path.exists():
        print(f'{name}: FILE NOT FOUND')
        continue
    doc = fitz.open(str(path))
    meta = doc.metadata
    print(f'{name}:')
    print(f'  Pages: {doc.page_count}')
    title = meta.get('title', 'N/A')
    print(f'  Title: {title[:120]}')

    # Search for volume info in first pages
    for p in range(2, 12):
        t = doc[p].get_text('text')
        if 'Volume 1' in t or 'Volume 2' in t:
            idx = t.find('Volume')
            print(f'  Page {p}: ...{t[max(0,idx-20):idx+80].strip()}...')
            break
        if 'Supraventricular' in t:
            idx = t.find('Supraventricular')
            print(f'  Page {p}: ...{t[max(0,idx-20):idx+80].strip()}...')
            break
        if 'Atrial Fibrillation and Atrial Flutter' in t:
            idx = t.find('Atrial Fibrillation')
            print(f'  Page {p}: ...{t[max(0,idx-20):idx+80].strip()}...')
            break

    # Check Case 10 text to confirm volume
    for p in range(100, 140):
        t = doc[p].get_text('text')
        m = re.search(r'Case\s+10\s*\n', t)
        if m:
            ctx = t[m.start():m.start()+200].replace('\n',' ')
            print(f'  Case 10 start: {ctx[:150]}')
            break

    doc.close()
    print()
