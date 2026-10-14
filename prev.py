import sys, cairosvg
s = open(sys.argv[1]).read()
css = '<style>.bbl{font:500 11px sans-serif;fill:#2C2C2A}.t,.ts,.th{font-family:sans-serif}.ts{font-size:12px;fill:#5F5E5A}.th{font-size:14px;font-weight:500;fill:#2C2C2A}.c-gray>rect{fill:#F1EFE8;stroke:#5F5E5A}.c-purple>rect,.c-amber>rect,.c-teal>rect,.c-gray>rect{fill:#EEEDFE;stroke:#534AB7}.c-purple>.th,.c-amber>.th,.c-teal>.th{fill:#3C3489}.c-purple>.ts{fill:#534AB7}.leader{stroke:#888780;stroke-width:0.5;stroke-dasharray:3 2}.arr{stroke:#444;stroke-width:1.5;fill:none}</style>'
s = s.replace('var(--t)', '#888780').replace('var(--p)', '#2C2C2A').replace('var(--s)','#5F5E5A')
i = s.index('>', s.index('<svg')) + 1
s = s[:i] + css + s[i:]
s = s.replace('width="100%"', 'width="1360"', 1)
cairosvg.svg2png(bytestring=s.encode(), write_to=sys.argv[2], background_color='white')
