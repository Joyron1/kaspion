#!/usr/bin/env bash
# Start the built app on PORT (default 3100) in the background, replacing an old one.
PORT=${PORT:-3100}
ps -eo pid,args | grep -E "[n]ext-server|[n]ext start -p $PORT" | awk '{print $1}' | xargs -r kill 2>/dev/null
sleep 1
nohup npx next start -p "$PORT" > "${LOG:-/tmp/kaspion-server.log}" 2>&1 &
for i in $(seq 1 40); do
  sleep 0.5
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/")
  [ "$code" = "200" ] && exit 0
done
echo "server did not start" >&2; tail -5 "${LOG:-/tmp/kaspion-server.log}" >&2; exit 1
