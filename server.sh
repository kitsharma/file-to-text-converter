#!/bin/bash

PIDFILE="/tmp/career-wizard-server.pid"
PORT=3003

start_server() {
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "Server already running on port $PORT (PID: $PID)"
            return 0
        else
            rm -f "$PIDFILE"
        fi
    fi
    
    echo "Starting server on port $PORT..."
    python3 -m http.server $PORT > /tmp/server.log 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > "$PIDFILE"
    sleep 1
    if kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "Server started with PID: $SERVER_PID"
        echo "Visit: http://localhost:$PORT/examples/simple-upload.html"
    else
        echo "Failed to start server (check /tmp/server.log)"
        rm -f "$PIDFILE"
    fi
}

stop_server() {
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID"
            rm -f "$PIDFILE"
            echo "Server stopped (PID: $PID)"
        else
            echo "Server not running"
            rm -f "$PIDFILE"
        fi
    else
        echo "Server not running"
    fi
}

case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        stop_server
        sleep 1
        start_server
        ;;
    status)
        if [ -f "$PIDFILE" ]; then
            PID=$(cat "$PIDFILE")
            if kill -0 "$PID" 2>/dev/null; then
                echo "Server running on port $PORT (PID: $PID)"
            else
                echo "Server not running (stale PID file)"
                rm -f "$PIDFILE"
            fi
        else
            echo "Server not running"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac