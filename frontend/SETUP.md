# Frontend Setup Guide
## Nouryon IM Platform — ChemCore International
### React + Vite + Tailwind + Framer Motion

---

## What you're getting

A fully Nouryon-branded, light-mode React frontend that replaces `app/` in your
existing project. Features:

- **Sidebar** with FinOps / Mon / Dev / Sec / Gov navigation (Framer Motion shared-layout transitions)
- **Dev view** — two datacenter cards (Mumbai active, East US planned), each expandable into three rack sections (Primary / Secondary / Disaster Recovery), with animated server rack UI and VM state indicators
- **VM cards** — click to expand: specs, cost, resource meters, snooze schedule, business need
- **Animated VM states** — pulsing green (running), breathing amber (snoozed), solid red (destroyed), greyed out (future slots)
- **FinOps view** — cost KPIs, credit tracker, savings breakdown, per-VM cost table
- **Add Datacenter modal** — region picker, adds planned DC card instantly
- **Mon / Sec / Gov** — "coming soon" placeholders with planned feature lists

---

## Step 1 — Create the `frontend/` folder in your project

Your current project structure:

```
excel-dashboard-devops/
├── .github/
├── ansible/
├── app/              ← existing Flask frontend (keep it, don't delete)
├── inventory/
├── terraform/
├── inventory.yml
├── requirements.txt
└── README.md
```

Create a new folder at the root level:

```
excel-dashboard-devops/
├── frontend/         ← NEW — all React code goes here
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── index.html
```

---

## Step 2 — Copy files from the ZIP

All files from this ZIP go into `frontend/`. The structure inside is:

```
frontend/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── data/
│   │   └── inventory.js
│   └── components/
│       ├── Sidebar.jsx
│       ├── StatusDot.jsx
│       ├── VMCard.jsx
│       ├── RackSection.jsx
│       ├── DatacenterCard.jsx
│       ├── AddDatacenterModal.jsx
│       ├── DevView.jsx
│       ├── FinOpsView.jsx
│       └── PlaceholderView.jsx
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Step 3 — Install Node.js (if not already installed)

Check if you have it:
```bash
node --version   # needs v18 or higher
npm --version
```

If not installed, download from https://nodejs.org (LTS version).

---

## Step 4 — Install dependencies

```bash
cd frontend
npm install
```

This installs React 18, Framer Motion, Lucide React, Vite, and Tailwind CSS.

---

## Step 5 — Run the dev server

```bash
npm run dev
```

Open http://localhost:3000 — you'll see the full dashboard.

The Vite proxy is already configured to forward `/api` calls to `http://localhost:5000`
(your existing Flask backend). So you can run both simultaneously:

**Terminal 1 — Flask backend:**
```bash
cd ..            # back to project root
python app/app.py
```

**Terminal 2 — React frontend:**
```bash
cd frontend
npm run dev
```

---

## Step 6 — Connect the frontend to your Flask API (optional)

The frontend currently uses static data from `src/data/inventory.js` (mirrors your `inventory/inventory.json`).

To make it live, edit `src/data/inventory.js` and replace with API calls, or add a
`useEffect` in `DevView.jsx`:

```js
// In DevView.jsx, add this inside the component:
useEffect(() => {
  fetch('/api/inventory')
    .then(r => r.json())
    .then(data => setDatacenters(/* transform data */))
}, [])
```

Add a corresponding route to `app/app.py`:
```python
@app.route('/api/inventory')
def get_inventory():
    with open('../inventory/inventory.json') as f:
        return jsonify(json.load(f))
```

---

## Step 7 — Production build (for deployment)

```bash
cd frontend
npm run build
```

This outputs to `frontend/dist/`. To serve it from Flask, update `app/app.py`:

```python
from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder='../frontend/dist', static_url_path='')

@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')
```

Then your Flask app serves both the React frontend AND the API on port 5000.

---

## Step 8 — Add to Ansible deploy (for GitHub Actions CI/CD)

In your `ansible/deploy.yml`, add these tasks before starting Flask:

```yaml
- name: Install Node.js
  apt:
    name: nodejs
    state: present

- name: Install npm
  apt:
    name: npm
    state: present

- name: Copy frontend source
  copy:
    src: ../frontend/
    dest: /opt/dashboard-app/frontend/
    owner: "{{ app_user }}"

- name: Install frontend dependencies
  shell: cd /opt/dashboard-app/frontend && npm install
  args:
    executable: /bin/bash

- name: Build React frontend
  shell: cd /opt/dashboard-app/frontend && npm run build
  args:
    executable: /bin/bash
```

---

## File reference

| File | Purpose |
|------|---------|
| `src/data/inventory.js` | VM data — mirrors your inventory.json |
| `src/App.jsx` | Root component, nav routing |
| `src/components/Sidebar.jsx` | Left nav (FinOps/Mon/Dev/Sec/Gov) |
| `src/components/DevView.jsx` | Main infra view with KPIs and DC cards |
| `src/components/DatacenterCard.jsx` | Expandable datacenter tile |
| `src/components/RackSection.jsx` | Rack panel (Primary/Secondary/DR) |
| `src/components/VMCard.jsx` | Individual VM with rack-unit chrome |
| `src/components/StatusDot.jsx` | Animated state indicator |
| `src/components/AddDatacenterModal.jsx` | Add DC modal |
| `src/components/FinOpsView.jsx` | Cost dashboard |
| `src/components/PlaceholderView.jsx` | Mon/Sec/Gov stubs |
| `tailwind.config.js` | Nouryon brand colour tokens |

---

## Troubleshooting

**`npm install` fails** — Make sure Node.js ≥ 18 is installed.

**Port 3000 in use** — Change `port: 3000` in `vite.config.js`.

**Flask API calls fail** — Make sure Flask is running on port 5000 and the proxy in `vite.config.js` points to it.

**Tailwind classes not applying** — Run `npm run dev` again; Vite's hot reload picks up new class names automatically.

**Framer Motion layout warnings** — These are cosmetic; use React 18 strict mode only in development.
