"""Read-only duplicate preflight for the private version-2 RoadMesh snapshot.

Prints counts only. Does not connect to any database or modify the export.
A nonzero result blocks migration 003 until conflicts are reviewed privately.
"""
import argparse
import csv
import io
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from business_rules import identity, text  # noqa: E402


def inspect(path):
    raw=path.read_text(encoding='utf-8-sig')
    try:
        data=json.loads(raw)
    except json.JSONDecodeError:
        csv.field_size_limit(2**30)
        rows=list(csv.DictReader(io.StringIO(raw)))
        if len(rows)!=1 or 'backup' not in rows[0]:
            raise ValueError('Expected one complete backup row')
        data=json.loads(rows[0]['backup'])
    if data.get('format')!='roadmesh-snapshot-v1':
        raise ValueError('Unrecognized snapshot format')
    report={}
    rules={
        'clients':{'nif':lambda r:identity(r.get('nif')), 'identity':lambda r:tuple(text(r.get(k)) for k in ('name','nif','phone','email','address'))},
        'vehicles':{'plate':lambda r:identity(r.get('license_plate')), 'vin':lambda r:identity(r.get('vin'))},
        'products':{'reference':lambda r:text(r.get('reference')).upper(),'barcode':lambda r:identity(r.get('barcode'))},
    }
    for table,keys in rules.items():
        source=data['tables'][table]
        if len(source)!=data['counts'][table]:
            raise ValueError('Incomplete snapshot')
        for name,normalize in keys.items():
            groups=defaultdict(int)
            for record in source:
                row={**record.get('metadata',{}),**record}
                value=normalize(row)
                if value:
                    groups[(row['workshop_id'],value)]+=1
            report[table+'.'+name]={'conflict_groups':sum(n>1 for n in groups.values()),
                'affected_records':sum(n for n in groups.values() if n>1)}
    return {'source_format':data['format'],'schema_version':data.get('schema_version'),
        'conflicts':report,'can_apply_unique_indexes':not any(r['conflict_groups'] for r in report.values())}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshot',type=Path)
    args=parser.parse_args()
    result=inspect(args.snapshot)
    print(json.dumps(result,indent=2,ensure_ascii=False))
    raise SystemExit(0 if result['can_apply_unique_indexes'] else 2)
