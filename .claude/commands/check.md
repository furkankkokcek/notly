Syntax-check all JavaScript files in the Notly project using Node.js.

Run:

```bash
for f in js/**/*.js js/*.js pages/*.js; do
  node --check "$f" && echo "OK: $f" || echo "ERROR: $f"
done
```

Report each file's result. If all files pass, confirm "✅ All JS files OK."
If any file has errors, show the error message and the file path so it can be fixed.
