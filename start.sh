#!/bin/bash

# Resume Analyzer Server Management Script

PORT=8000
PIDFILE="/tmp/resume_analyzer_server.pid"

case "$1" in
    start)
        echo "Starting Resume Analyzer server on port $PORT..."
        
        # Kill any existing server on the port
        if lsof -i :$PORT > /dev/null 2>&1; then
            echo "Killing existing server on port $PORT..."
            lsof -t -i :$PORT | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
        
        # Start new server
        python3 -m http.server $PORT > server.log 2>&1 &
        SERVER_PID=$!
        echo $SERVER_PID > $PIDFILE
        
        # Wait a moment and check if server started
        sleep 2
        if ps -p $SERVER_PID > /dev/null; then
            echo "✅ Server started successfully on http://localhost:$PORT"
            echo "📄 Logs: tail -f server.log"
            echo "🛑 Stop: ./start.sh stop"
        else
            echo "❌ Failed to start server"
            exit 1
        fi
        ;;
        
    stop)
        echo "Stopping Resume Analyzer server..."
        
        # Kill by PID file
        if [ -f $PIDFILE ]; then
            PID=$(cat $PIDFILE)
            if ps -p $PID > /dev/null; then
                kill -9 $PID
                echo "✅ Server (PID: $PID) stopped"
            else
                echo "⚠️ Server process not found"
            fi
            rm -f $PIDFILE
        fi
        
        # Also kill any processes on the port
        if lsof -i :$PORT > /dev/null 2>&1; then
            echo "Killing remaining processes on port $PORT..."
            lsof -t -i :$PORT | xargs kill -9 2>/dev/null || true
        fi
        
        echo "🛑 Server stopped"
        ;;
        
    restart)
        echo "Restarting Resume Analyzer server..."
        $0 stop
        sleep 2
        $0 start
        ;;
        
    status)
        if [ -f $PIDFILE ]; then
            PID=$(cat $PIDFILE)
            if ps -p $PID > /dev/null; then
                echo "✅ Server is running (PID: $PID) on http://localhost:$PORT"
            else
                echo "❌ Server is not running (stale PID file)"
                rm -f $PIDFILE
            fi
        else
            if lsof -i :$PORT > /dev/null 2>&1; then
                echo "⚠️ Something is running on port $PORT but not managed by this script"
                lsof -i :$PORT
            else
                echo "❌ Server is not running"
            fi
        fi
        ;;
        
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the Resume Analyzer server"
        echo "  stop    - Stop the Resume Analyzer server"
        echo "  restart - Restart the Resume Analyzer server"
        echo "  status  - Check server status"
        echo ""
        echo "Server URL: http://localhost:$PORT"
        exit 1
        ;;
esac