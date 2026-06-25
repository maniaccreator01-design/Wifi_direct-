const net = require('net');
const http = require('http');
const { spawn, exec } = require('child_process');
const fs = require('fs');

// ==========================================
// 1. AUDIO SOCKET LAYER (Existing & Working)
// ==========================================
function startWifiServer(port = 8080) {
    const server = net.createServer((socket) => {
        console.log('\n[Audio] Parent Unit connected! Streaming microphone...');
        const micStream = spawn('termux-microphone-record', ['-d']);
        micStream.stdout.pipe(socket);

        socket.on('close', () => {
            micStream.kill();
            spawn('termux-microphone-record', ['-e']);
        });
    });
    server.listen(port, '0.0.0.0');
    return server;
}

function connectToWifiServer(hostIP, port = 8080) {
    const client = new net.Socket();
    const audioStreamFile = fs.createWriteStream('./live_baby_stream.raw');
    client.connect(port, hostIP, () => {
        console.log('[Audio] Connected to microphone stream!');
    });
    client.on('data', (chunk) => {
        audioStreamFile.write(chunk);
    });
    return client;
}

// ==========================================
// 2. NEW: VIDEO STREAMING LAYER (MJPEG HTTP)
// ==========================================
function startVideoServer(port = 8081) {
    const server = http.createServer((req, res) => {
        console.log('\n[Video] Parent Unit requested video feed...');
        
        // Set HTTP headers for live MJPEG streaming boundary packets
        res.writeHead(200, {
            'Cache-Control': 'no-cache, private, max-age=0, no-store, must-revalidate',
            'Connection': 'keep-alive',
            'Content-Type': 'multipart/x-mixed-replace; boundary=--frame'
        });

        // Loop function to rapidly take photos and push them into the stream
        const streamInterval = setInterval(() => {
            // -c 0 targets the primary back camera (use -c 1 for front selfie camera)
            exec('termux-camera-photo -c 0 ./frame.jpg', (err) => {
                if (err) return;

                fs.readFile('./frame.jpg', (readErr, data) => {
                    if (readErr) return;
                    
                    // Write the MJPEG boundary header and frame data chunk
                    res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${data.length}\r\n\r\n`);
                    res.write(data);
                    res.write('\r\n');
                });
            });
        }, 150); // Generates roughly ~7 frames per second (perfect for low bandwidth offline monitor)

        req.on('close', () => {
            clearInterval(streamInterval);
            console.log('[Video] Parent Unit stopped watching video.');
        });
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`Video Unit active. Video Stream ready on port ${port}...`);
    });
}

module.exports = { startWifiServer, connectToWifiServer, startVideoServer };
