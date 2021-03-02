import * as gulp from 'gulp';
import * as del from 'del';
import * as shell from 'gulp-shell';

gulp.task('index', () => {
  return gulp.src('./src/server/*.pug')
    .pipe(gulp.dest('./server'));
});

gulp.task('aot-ts', shell.task([
  'aot-fixer-pug --src-path src/client',
]));

gulp.task('clean', () => {
  del(['app', 'server', 'public/js', 'src/client/**/*.js', 'src/client/**/*.js.map', 'src/client/aot',
    'src/client/compiled', 'src/client/**/*.ngfactory.ts',
  ]).catch((err: Error) => console.error(err));
});

gulp.task('webpack-clean', () => {
  del(['public/js']).catch((err: Error) => console.error(err));
});

gulp.task('aot-clean', () => {
  del(['src/client/compiled', 'src/client/aot']).catch((err: Error) => console.error(err));
});

gulp.task('aot-run', shell.task([
  'ngc -p ./src/client/tsconfig-aot.json',
]));

gulp.task('default', () => {
  gulp.watch('./src/**/*.pug', gulp.series('aot-ts'));
});
