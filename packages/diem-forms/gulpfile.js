"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gulp_1 = __importDefault(require("gulp"));
const gulp_shell_1 = __importDefault(require("gulp-shell"));
gulp_1.default.task('aot-ts', gulp_shell_1.default.task([
    'aot-fixer-pug --src-path src/',
]));
gulp_1.default.task('default', () => {
    gulp_1.default.watch('./src/**/*.pug', gulp_1.default.series('aot-ts'));
});
