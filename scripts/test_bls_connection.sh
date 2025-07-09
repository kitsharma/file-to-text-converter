#!/bin/bash
# scripts/test_bls_connection.sh
# Test script for BLS API connection with full debugging information

echo "=== BLS API Connection Test Script ==="
echo "Testing connection to Bureau of Labor Statistics API"
echo "Generated at: $(date)"
echo "======================================="
echo ""

# BLS API v2 endpoint
BLS_API_URL="https://api.bls.gov/publicAPI/v2/timeseries/data/"

# Test data series IDs
# CES0000000001 = Total nonfarm employment
# LAUCN040010000000005 = Unemployment rate
# CUUR0000SA0 = Consumer Price Index
SERIES_IDS='["CES0000000001", "LAUCN040010000000005", "CUUR0000SA0"]'

# Current year for data request
CURRENT_YEAR=$(date +%Y)
START_YEAR=$((CURRENT_YEAR - 2))

# Request payload
REQUEST_PAYLOAD=$(cat <<EOF
{
  "seriesid": ${SERIES_IDS},
  "startyear": "${START_YEAR}",
  "endyear": "${CURRENT_YEAR}",
  "registrationkey": "${BLS_API_KEY:-}"
}
EOF
)

echo "Request Configuration:"
echo "- Endpoint: ${BLS_API_URL}"
echo "- Start Year: ${START_YEAR}"
echo "- End Year: ${CURRENT_YEAR}"
echo "- Series IDs: ${SERIES_IDS}"
echo "- API Key Present: $([ -n "${BLS_API_KEY}" ] && echo "Yes" || echo "No")"
echo ""
echo "Request Payload:"
echo "${REQUEST_PAYLOAD}"
echo ""
echo "======================================="
echo "Executing curl command with full verbose output..."
echo ""

# Full curl command with all debugging flags
curl -v \
  --request POST \
  --url "${BLS_API_URL}" \
  --header "Content-Type: application/json" \
  --header "Accept: application/json" \
  --header "User-Agent: CareerAI-Platform/1.0" \
  --data "${REQUEST_PAYLOAD}" \
  --max-time 30 \
  --show-error \
  --fail-with-body \
  --write-out "\n\n=== Response Statistics ===\n\
HTTP Code: %{http_code}\n\
Total Time: %{time_total}s\n\
DNS Lookup Time: %{time_namelookup}s\n\
Connect Time: %{time_connect}s\n\
TLS Handshake Time: %{time_appconnect}s\n\
Start Transfer Time: %{time_starttransfer}s\n\
Download Size: %{size_download} bytes\n\
Download Speed: %{speed_download} bytes/sec\n\
Remote IP: %{remote_ip}\n\
SSL Verify Result: %{ssl_verify_result}\n" \
  --trace-ascii /tmp/bls_trace.log \
  --dump-header /tmp/bls_headers.txt \
  --output /tmp/bls_response.json \
  2>&1 | tee /tmp/bls_debug.log

# Display results
echo ""
echo "======================================="
echo "Response Headers:"
cat /tmp/bls_headers.txt 2>/dev/null || echo "No headers file found"

echo ""
echo "======================================="
echo "Response Body:"
cat /tmp/bls_response.json 2>/dev/null | python3 -m json.tool 2>/dev/null || cat /tmp/bls_response.json 2>/dev/null || echo "No response body"

echo ""
echo "======================================="
echo "Trace Log (first 100 lines):"
head -n 100 /tmp/bls_trace.log 2>/dev/null || echo "No trace log found"

echo ""
echo "======================================="
echo "Debug files created:"
echo "- Full debug log: /tmp/bls_debug.log"
echo "- Response headers: /tmp/bls_headers.txt"
echo "- Response body: /tmp/bls_response.json"
echo "- ASCII trace: /tmp/bls_trace.log"
echo ""
echo "To share with debugging team, run:"
echo "tar -czf bls_debug_$(date +%Y%m%d_%H%M%S).tar.gz /tmp/bls_*.{log,txt,json}"