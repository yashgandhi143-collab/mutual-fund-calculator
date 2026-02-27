# Mutual Fund Calculator

A simple, client-side **Mutual Fund Calculator** suite built with **HTML**, **Bootstrap CSS**, and **vanilla JavaScript**. Runs fully in the browser — no backend, no build tools required.

> 🚀 Live Site: [yashgandhi143-collab.github.io/mutual-fund-calculator](https://yashgandhi143-collab.github.io/mutual-fund-calculator/)

---

## 📌 Available Calculators

| Calculator | Status |
|---|---|
| SIP Calculator | ✅ Available |
| Lumpsum Calculator | 🔜 Coming Soon |
| CAGR Calculator | 🔜 Coming Soon |
| SWP Calculator | 🔜 Coming Soon |
| Expense Ratio Impact | 🔜 Coming Soon |

---

## ✨ Features

- Runs fully in the browser (no backend, no server needed).
- Responsive UI built with Bootstrap 5.
- Modular structure — each calculator is its own standalone page.
- Easy to reuse and extend with new calculators.
- Works with a custom domain via GitHub Pages.

---

## 📁 Project Structure

```
mutual-fund-calculator/
│
├── docs/                          ← GitHub Pages root (served on the domain)
│   ├── index.html                 ← Home page (lists all calculators)
│   ├── sip-calculator/
│   │   └── index.html             ← SIP Calculator page
│   ├── lumpsum-calculator/        ← (Coming soon)
│   │   └── index.html
│   ├── cagr-calculator/           ← (Coming soon)
│   │   └── index.html
│   └── assets/
│       ├── css/
│       │   └── styles.css         ← Global custom styles
│       ├── js/
│       │   └── app.js             ← Shared JS utilities
│       └── img/                   ← Images and icons
│
├── README.md
├── .gitignore
└── LICENSE
```

---

## 🚀 Getting Started

### Run locally
1. Clone this repository:
   ```bash
   git clone https://github.com/yashgandhi143-collab/mutual-fund-calculator.git
   ```
2. Open `docs/index.html` in your browser — no server required.

> **Tip:** For the best local experience, use VS Code with the **Live Server** extension.

### Deploy on GitHub Pages
1. Go to **Settings → Pages**
2. Set **Source**: `Deploy from a branch`
3. Set **Branch**: `main`, **Folder**: `/docs`
4. Click **Save**

### Connect a custom domain
1. Go to **Settings → Pages → Custom domain**
2. Enter your domain (e.g., `mf.yourdomain.com`)
3. Enable **Enforce HTTPS**
4. Add a **CNAME** DNS record at your registrar:
   - `mf` → `yashgandhi143-collab.github.io`

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Structure |
| Bootstrap 5 | Responsive UI |
| Vanilla JavaScript | Calculator logic & DOM updates |

---

## 📄 License

This project is licensed under the **MIT License** — you are **free to use, modify, distribute, and even use commercially**, as long as the original license and attribution are included.

See the [LICENSE](./LICENSE) file for full details.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to fork this repo, make changes, and open a pull request.

---

> Made with ❤️ using HTML, Bootstrap & JavaScript.