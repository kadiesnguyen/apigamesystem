"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// api/load-env.ts
var dotenv_1 = require("dotenv");
var url_1 = require("url");
var path_1 = require("path");
var __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
// .env ở project root (cùng level với /api và /src)
(0, dotenv_1.config)({ path: path_1.default.resolve(__dirname, '../.env') });
// (tuỳ chọn) log nhanh để kiểm tra
console.log('ENV OK:', process.env.PG_HOST, process.env.PG_USER);
