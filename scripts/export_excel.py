
import openpyxl
import json
import os

path = 'D:/BACKUP GERAL/CCB - SECRETARIA MUSICAL/REGIONAL ITAPEVI/IGREJAS REGIONAL ITAPEVI.xlsx'
output = 'scripts/excel_data.json'

wb = openpyxl.load_workbook(path, data_only=True)
sheet = wb.active

data = []
headers = [cell.value for cell in sheet[1]]

for row in sheet.iter_rows(min_row=2, values_only=True):
    if any(row):
        data.append(dict(zip(headers, row)))

with open(output, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Successfully exported {len(data)} rows to {output}")
