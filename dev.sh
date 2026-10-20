#!/bin/sh
# Start the persistent, isolated local demonstration.
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -x .demo/venv/bin/python ]; then
  demo_python=.demo/venv/bin/python
elif [ -n "${PYTHON:-}" ]; then
  demo_python=$PYTHON
elif command -v python3.12 >/dev/null 2>&1; then
  demo_python=python3.12
else
  demo_python=python3
fi
exec "$demo_python" scripts/demo.py "$@"
