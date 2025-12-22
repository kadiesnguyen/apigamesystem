import { verifyToken } from './utils/Api.js';
import { connectWebSocket } from './utils/WebSocket.js';
import GameConfig from './utils/GameConfig.js';
import EventBus from './utils/EventBus.js';
import MockSpinResult from './views/data_test.js';

(function () {
    var instance;

    function Controller() {
        this.init();
    }

    Controller.prototype.init = function () {
        if (instance) return instance;
        instance = this;
        console.log('Controller initialized');

        this._listeners = {};
        this._user = {
            userId: 0,
            username: 'guest',
            partnerId: 0,
            balance: 0,
        };
        const AutoLogin = true;
        // console.log('body:', body);
        // console.log('signature:', signature);
        // lấy token
        //không cần dùng axios để gọi API, dùng fetch
        if (AutoLogin) {
            const crypto = require('crypto');
            // const axios = require('axios');

            const apiKey = 'partner_abc';
            const secretKey = '74286262f408';
            const username = 'testuser1';
            const password = '123456';

            const body = { username, password };
            const rawBody = JSON.stringify(body);
            const timestamp = Date.now().toString();
            const method = 'POST';
            const pathname = '/api/user/login';
            const payload = `${method}|${pathname}|${timestamp}|${rawBody}`;
            const signature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
            console.error("CheckingGame autoLogin:");
            // console.log(GameConfig.url_api);
            fetch(`${GameConfig.url_api}/api/user/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                    'X-Signature': signature,
                    'X-Timestamp': timestamp,
                },
                body: JSON.stringify(body),
            })
                .then(response => {
                    console.error("CheckingGame autoLogin 1");
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(payload => {
                    console.error("CheckingGame autoLogin 2");
                    console.log('Login successful:', payload);
                    this.token = payload.data.token;
                    console.log(this.token);
                    this.gameID = "1003";
                    this.authenticate();
                    // console.log('User info:', this._user);
                    // Kết nối WebSocket sau khi có token
                    console.error("CheckingGame connectWebSocket:"+this.gameID+":"+this.token);
                    this._ws = connectWebSocket(this.gameID, this.token);
                    this._setupWebSocketErrorHandling();
                    // this.authenticate();
                    // Gửi thông tin người dùng mỗi giây để cập nhật trạng thái
                    // setInterval(() => {
                    //     this.getProfile().then(profile => {
                    //         console.log('📥 Nhận profile:', profile);
                    //         const { userId, username, partnerId, balance, freeSpins} = profile.payload.data.user;
                    //         console.log('User info:', { userId, username, partnerId, balance, freeSpins });
                    //         // kiểm tra balance có thay đổi không
                    //         if (this._user.balance === balance) {
                    //             EventBus.emit('balance:changed', balance); // Phát đi sự kiện cập nhật
                    //         }
                    //         this._user = {
                    //             userId,
                    //             username,
                    //             partnerId,
                    //             balance,
                    //         };
                    //     }).catch(err => {
                    //         console.error('❌ Lỗi khi lấy profile:', err);
                    //     });
                    // }, 1000);
                })
                .catch(error => {
                    console.log('>>> Controller: Emit game:NotLogin từ AutoLogin catch');
                    console.trace('>>> Controller: AutoLogin catch call stack:'); // Thêm stack trace để debug
                    EventBus.emit('game:NotLogin');
                    console.error('❌ Lỗi đăng nhập:', error);
                    // Xử lý lỗi đăng nhập, có thể hiển thị thông báo cho người dùng
                });

            // if (!this.token) {
            //     console.error('❌ Không có token trong URL');
            //     // Show lỗi hoặc thoát game
            //     return;
            // }
            // this.authenticate();
            return;
        }

        // lấy param từ URL
        const urlParams = new URLSearchParams(window.location.search);
        // console.log('URL Params:', urlParams);
        // const userId = urlParams.get('userId');
        const token = urlParams.get('token');
        this.gameID = urlParams.get('gameID') || "1001"; // mặc định gameID là 1001 nếu không có trong URL
        // console.log('Token từ URL:', token);
        // console.log('User ID từ URL:', userId);
        // console.log('Game ID từ URL:', this.gameID);
        if (token) {
            this.login(token);
        } else {
            console.log('>>> Controller: Emit game:NotLogin từ không có token trong URL');
            console.trace('>>> Controller: No token call stack:'); // Thêm stack trace để debug
            console.log('❌ Không có token trong URL, emit game:NotLogin');
            EventBus.emit("game:NotLogin");
        }
    };

    Controller.prototype.login = async function (launchToken) {
        try {
            const res = await fetch(`${GameConfig.url_api}/api/user/token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: launchToken }),
            });

            const json = await res.json();                     // ✅ chỉ parse 1 lần
            console.log('Kết quả từ API:', json);

            if (!res.ok || !json.success) {
                throw new Error(json.message || "Consume token failed");
            }

            // ✅ lấy sessionToken trả về từ server
            this.token = json.data.sessionToken;

            // ✅ xác thực & mở WS
            await this.authenticate();

            // ✅ gọi getProfile ngay khi WS sẵn sàng (1 lần)
            if (this._ws) {
                if (this._ws.readyState === WebSocket.OPEN) {
                    this.getProfile().then((profile) => {
                        const u = profile.payload.data.user;
                        const wallets = profile.payload.data.wallets || [];
                        const balance = wallets[0] ? wallets[0].balance : 0;
                        const freeSpins = wallets[0] ? wallets[0].free_spins : 0;
                        this._user = {
                            userId: u.id ?? u.userId,
                            username: u.username,
                            partnerId: u.partner_id ?? u.partnerId,
                            balance,
                            freeSpins
                        };
                        EventBus.emit('balance:changed', Number(balance).toFixed(2));
                        if (freeSpins > 0) {
                            EventBus.emit('freeSpins:available', freeSpins);
                        }
                    }).catch(console.error);
                } else {
                    this._ws.addEventListener('open', () => {
                        this.getProfile().then((profile) => {
                            const u = profile.payload.data.user;
                            const wallets = profile.payload.data.wallets || [];
                            const balance = wallets[0] ? wallets[0].balance : 0;
                            const freeSpins = wallets[0] ? wallets[0].free_spins : 0;
                            this._user = {
                                userId: u.id ?? u.userId,
                                username: u.username,
                                partnerId: u.partner_id ?? u.partnerId,
                                balance,
                                freeSpins
                            };
                            EventBus.emit('balance:changed', Number(balance).toFixed(2));
                            console.log("freeSpins", freeSpins);
                            if (freeSpins > 0) {
                                EventBus.emit('freeSpins:available', freeSpins);
                            }
                        }).catch(console.error);
                    }, { once: true });
                }
            }

        } catch (err) {
            console.log('>>> Controller: Emit game:NotLogin từ login catch');
            console.trace('>>> Controller: Login catch call stack:'); // Thêm stack trace để debug
            console.error("❌ Không consume được token:", err);
            EventBus.emit("game:NotLogin");
        }
    };

    Controller.prototype.getQueryParam = function (key) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(key);
    };

    Controller.prototype.authenticate = async function () {
        const result = await verifyToken(this.token);
        // console.log('Kết quả xác thực:', result);
        if (result.success) {
            console.log('Xác thực thành công:', result.data);
            this._user = result.data;
            if (this._user.freeSpins > 0) {
                console.log('Người dùng có lượt quay miễn phí:', this._user.freeSpins);
                EventBus.emit('freeSpins:available', this._user.freeSpins);
            }
            EventBus.emit('balance:changed', this._user.balance);
            EventBus.emit('game:LoginSuccess'); // Emit event login thành công
            // if (this._user.freeSpins
            // Kết nối socket
            console.log('Kết nối WebSocket với gameID:', this.gameID, 'và token:', this.token);
            this._ws = connectWebSocket(this.gameID, this.token);
            // mỗi 10s sẽ kiểm tra và cập nhật thông tin người dùng
            this.intervalId = setInterval(() => {
                if (this._ws && this._ws.readyState === WebSocket.OPEN) {
                    this.getProfile().then(profile => {
                        const u = profile.payload.data.user;
                        const wallets = profile.payload.data.wallets || [];
                        const balance = wallets[0] ? wallets[0].balance : 0;
                        const freeSpins = wallets[0] ? wallets[0].free_spins : 0;

                        // ✅ luôn map về schema thống nhất
                        const nextUser = {
                            userId: u.id ?? u.userId,                    // hỗ trợ cả id/userId
                            username: u.username,
                            partnerId: u.partner_id ?? u.partnerId,
                            balance: balance,
                            freeSpins: freeSpins
                        };

                        if (balance || nextUser.balance) {
                            // console.log('Cập nhật balance:', nextUser.balance);
                            let newBalance = Number(nextUser.balance).toFixed(2);
                            EventBus.emit('balance:changed', newBalance);
                        }

                        // ✅ Cập nhật free spins nếu có thay đổi
                        // console.log("freeSpins", freeSpins);

                        this._user = nextUser;

                        // console.log("this._user.freeSpins", this._user.freeSpins);
                        // if (this._user.freeSpins > 0) {
                        // console.log('Cập nhật free spins:', freeSpins);
                        // EventBus.emit('freeSpins:available', freeSpins);
                        // }
                    }).catch(err => {
                        console.error('❌ Lỗi khi lấy profile:', err);
                    });
                }
            }, 10000);
        } else {
            // hiện node not login
            console.log('>>> Controller: Emit game:NotLogin từ authenticate else');
            console.trace('>>> Controller: Authenticate else call stack:'); // Thêm stack trace để debug
            EventBus.emit('game:NotLogin');
            console.error('❌ Token không hợp lệ:', result.error);
        }
    };

    Controller.prototype.manualLogin = function (apiKey, secretKey, username, password) {
        const crypto = require('crypto');
        const body = { username, password };
        const rawBody = JSON.stringify(body);
        const timestamp = Date.now().toString();
        const method = 'POST';
        const pathname = '/api/user/login';
        const payload = `${method}|${pathname}|${timestamp}|${rawBody}`;
        const signature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');

        fetch(`${GameConfig.url_api}/api/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'X-Signature': signature,
                'X-Timestamp': timestamp,
            },
            body: rawBody,
        })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(payload => {
                console.log('✅ Đăng nhập thành công:', payload);
                this.token = payload.data.token;
                this.gameID = "1003";
                this.authenticate(); // sẽ tự kết nối websocket và lấy profile
                return true; // trả về true nếu đăng nhập thành công
            })
            .catch(err => {
                console.log('>>> Controller: Emit game:NotLogin từ manualLogin catch');
                console.trace('>>> Controller: ManualLogin catch call stack:'); // Thêm stack trace để debug
                EventBus.emit('game:NotLogin');
                console.error('❌ Lỗi đăng nhập:', err.message || err);
                return false; // trả về false nếu có lỗi
            });

    };

    Controller.prototype.getProfile = function () {
        return new Promise((resolve, reject) => {
            // ✅ đúng tên WebSocket
            if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
                return reject(new Error('WebSocket không mở'));
            }

            const requestId = Date.now().toString(36); // nonce
            const req = {
                type: 'getProfile',
                requestId,
                // ✅ luôn gửi theo 1 schema thống nhất
                payload: { userId: this._user.userId, gameID: this.gameID }
            };

            const onMsg = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'getProfileResult') {
                        cleanup();
                        // console.log('📥 Nhận profile:', data.payload.data);
                        return resolve(data);
                    }
                    if (data.type === 'error' && data.requestId === requestId) {
                        cleanup();
                        return reject(new Error(data.message || 'WS error'));
                    }
                } catch (e) {
                    cleanup();
                    return reject(e);
                }
            };

            const t = setTimeout(() => {
                cleanup();
                reject(new Error('getProfile timeout'));
            }, 3000);

            const cleanup = () => {
                clearTimeout(t);
                this._ws && this._ws.removeEventListener('message', onMsg);
            };

            // ✅ gắn trước – và không đè onmessage toàn cục
            this._ws.addEventListener('message', onMsg);
            this._ws.send(JSON.stringify(req));
        });
    };

    Controller.prototype.spin = function (bet) {
        console.error("CheckingGame spin bet:"+bet);
        return new Promise((resolve, reject) => {
            console.error("CheckingGame check ws:"+this._ws);
            if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
                return reject(new Error('WebSocket không mở'));
            }

            // Bảo đảm bet là số nguyên để tránh lỗi server (e.g. "invalid input syntax for type integer")
            const betInt = (() => {
                const n = Number(bet);
                if (!isFinite(n)) return 0;
                return Math.round(n);
            })();

            const payload = {
                type: 'spin',
                payload: {
                    bet: betInt,
                    userId: this._user.userId,
                    gameID: this.gameID
                }
            };
            console.error("CheckingGame spin:",payload);
            this._ws.send(JSON.stringify(payload));
            console.log('📤 Gửi yêu cầu spin:', payload);
            this._ws.onmessage = (event) => {
                // console.log('📨 Nhận WS:', event);
                const data = JSON.parse(event.data);
                 console.error("CheckingGame spin response:",data);
                if (data.type === 'spinResult') {
                    // console.log('📊 Kết quả quay:', data);
                    resolve(data);
                } else if (data.type === 'cascadeRound') {
                    // this.handleCascadeRound(data);
                    console.log('🔥 Cascade round:', data);
                    resolve(data);
                } else if (data.type === 'error') {
                    console.error('❌ Lỗi từ server:', data);
                    reject(new Error(data.message));
                }
            };
        });
    };


    Controller.prototype.handleCascadeRound = function (data) {
        // console.log(`🔥 Cascade #${data.index + 1}: +${data.winAmount} (x${data.multiplier})`);

        // Ví dụ: highlight các ô win
        for (const pos of data.winLines) {
            const cell = data.grid[pos.c][pos.r];
            // Bạn có thể gọi animation highlight theo tọa độ [c][r] ở đây
            // console.log(`🟨 Vị trí thắng: col=${pos.c}, row=${pos.r}, symbol=${cell.idx}`);
        }

        // Gọi UI để cập nhật lưới và hiệu ứng cascade
        // this.updateGrid(data.grid);
        // this.playCascadeAnimation(data);
    };

    Controller.prototype.handleSpinResult = function (result) {
        // console.log('📊 Kết quả quay:', result);
        if (!result || !result.success) {
            if (result && result.error == "01") {
                EventBus.emit('notifi:show', 'Không đủ tiền để quay. Vui lòng nạp thêm!');
                return;
            } else if (result && result.error == "02") {
                EventBus.emit('notifi:show', 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau!');
                return;
            } else if (result && result.error) {
                console.error('❌ Lỗi từ server:', result.error);
            }
        };
    }

    Controller.prototype._setupWebSocketErrorHandling = function () {
        if (!this._ws) return;

        // Thêm timeout detection
        this._lastMessageTime = Date.now();
        this._timeoutCheckInterval = setInterval(() => {
            if (this._ws && this._ws.readyState === WebSocket.OPEN) {
                const now = Date.now();
                const timeSinceLastMessage = now - this._lastMessageTime;

                // Nếu không nhận được message trong 30 giây, coi như timeout
                if (timeSinceLastMessage > 30000) {
                    console.error('❌ WebSocket timeout - không nhận được message trong 30s');
                    this._handleTimeout();
                }
            }
        }, 5000); // Kiểm tra mỗi 5 giây

        // Lưu reference gốc của onmessage để wrap nó
        const originalOnMessage = this._ws.onmessage;
        this._ws.onmessage = (event) => {
            this._lastMessageTime = Date.now(); // Cập nhật thời gian nhận message cuối
            if (originalOnMessage) {
                originalOnMessage.call(this._ws, event);
            }
        };

        // Thêm error handling
        const originalOnError = this._ws.onerror;
        this._ws.onerror = (event) => {
            console.error('❌ WebSocket error:', event);
            this._handleNetworkError('WebSocket connection error');
            if (originalOnError) {
                originalOnError.call(this._ws, event);
            }
        };

        // Thêm close handling
        const originalOnClose = this._ws.onclose;
        this._ws.onclose = (event) => {
            console.warn('⚠️ WebSocket connection closed:', event.code, event.reason);
            
            // Chỉ hiển thị lỗi mạng nếu connection bị đóng bất thường
            // Code 1000 = normal closure, code 1001 = going away, code 1006 = abnormal closure
            // Code 1006 có thể là đóng bình thường của server, không phải lỗi mạng
            if (event.code !== 1000 && event.code !== 1001 && event.code !== 1006) {
                this._handleNetworkError('WebSocket connection closed unexpectedly');
            } else {
                console.log('✅ WebSocket connection closed normally (code:', event.code, ')');
                
                // Nếu là code 1006, thử reconnect sau 1 giây
                if (event.code === 1006) {
                    console.log('🔄 WebSocket code 1006 - thử reconnect sau 1 giây');
                    setTimeout(() => {
                        if (!this._ws || this._ws.readyState === WebSocket.CLOSED) {
                            console.log('🔄 Đang reconnect WebSocket...');
                            this.init();
                        }
                    }, 1000);
                }
            }
            
            if (originalOnClose) {
                originalOnClose.call(this._ws, event);
            }
        };
    }

    Controller.prototype._handleTimeout = function () {
        console.warn('⚠️ WebSocket timeout - chỉ cảnh báo, không hiển thị lỗi mạng');
        
        // Clear timeout check interval
        if (this._timeoutCheckInterval) {
            clearInterval(this._timeoutCheckInterval);
            this._timeoutCheckInterval = null;
        }
        
        // Reset last message time để tránh spam timeout
        this._lastMessageTime = Date.now();
        
        // Restart timeout check để tiếp tục monitor
        this._setupWebSocketErrorHandling();
        
        // Không emit network error event, chỉ log warning
        // Có thể thêm logic khác như retry connection nếu cần
    };

    Controller.prototype._handleNetworkError = function (reason) {
        console.error('❌ Network error detected:', reason);

        // Clear timeout check interval
        if (this._timeoutCheckInterval) {
            clearInterval(this._timeoutCheckInterval);
            this._timeoutCheckInterval = null;
        }

        // Emit network error event
        EventBus.emit('game:NetworkError', reason);
    }

    // Thông báo cho client
    Controller.prototype.notify = function (message) {
        EventBus.emit(`notifi:show`, message);
    };

    Controller.prototype.getUser = function () {
        return this._user;
    };

    Controller.getInstance = function () {
        if (!instance) instance = new Controller();
        return instance;
    };

    cc.Controller = Controller;
})();
