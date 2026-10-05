import http.server
import socketserver
import json
import base64
import os
import re
import uuid
import hashlib
from urllib.parse import unquote
from PIL import Image, ImageOps, ImageEnhance

PORT = 8000
BASE_DIR = "/home/ac3v32/Escritorio/Mauriweb"
HTML_PATH = os.path.join(BASE_DIR, "index.html")
MODELOS_DIR = os.path.join(BASE_DIR, "modelos")
FOTOS_DIR = os.path.join(BASE_DIR, "fotos")
NEWS_DIR = os.path.join(BASE_DIR, "news_media")
LOOKBOOK_JSON_PATH = os.path.join(BASE_DIR, "lookbook.json")
CATALOGO_JSON_PATH = os.path.join(BASE_DIR, "catalogo.json")
NOTICIAS_JSON_PATH = os.path.join(BASE_DIR, "noticias.json")
RESEÑAS_JSON_PATH = os.path.join(BASE_DIR, "reseñas.json")
PEDIDOS_JSON_PATH = os.path.join(BASE_DIR, "pedidos.json")
FAQ_JSON_PATH = os.path.join(BASE_DIR, "faq.json")

ADMIN_PASSWORD_HASH = hashlib.sha256("Zonda202610".encode('utf-8')).hexdigest()
ACTIVE_ADMIN_SESSIONS = set()

os.makedirs(NEWS_DIR, exist_ok=True)

def load_json(path):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

def regenerate_html():
    # 1. Regenerate Lookbook
    lb_data = load_json(LOOKBOOK_JSON_PATH)
    lb_articles = []
    for item in lb_data:
        desc_html = f'<div class="product-info" style="pointer-events:none;"><h3 style="font-size:0.9rem;">{item["description"]}</h3></div>' if item.get("description") else ""
        article = f'''                    <article class="lookbook-item" style="position:relative;">
                        <img src="{item["src"]}" alt="Modelo Zonda" loading="lazy">
                        {desc_html}
                    </article>'''
        lb_articles.append(article)
    new_lb_grid = '<div class="lookbook-grid">\n' + "\n".join(lb_articles) + '\n                </div>'

    # 2. Regenerate Catalogo
    cat_data = load_json(CATALOGO_JSON_PATH)
    cat_articles = []
    for item in cat_data:
        article = f'''                    <article class="product-card">
                        <div class="product-img">
                            <img src="{item["src"]}" alt="{item["title"]}" loading="lazy">
                        </div>
                        <div class="product-info">
                            <h3>{item["title"]}</h3>
                            <p class="price">{item["price"]}</p>
                        </div>
                    </article>'''
        cat_articles.append(article)
    new_cat_grid = '<div class="products-grid">\n' + "\n".join(cat_articles) + '\n                </div>'

    # 3. Regenerate Noticias
    news_data = load_json(NOTICIAS_JSON_PATH)
    news_articles = []
    for item in news_data:
        media_html = ""
        if item.get("media"):
            if "video" in item.get("media_type", "") or item["media"].endswith((".mp4", ".webm")):
                media_html = f'''                        <div class="news-media">
                            <video src="{item["media"]}" autoplay loop muted playsinline style="width:100%; height:320px; object-fit:cover; border-radius:12px 12px 0 0; display:block;"></video>
                        </div>'''
            else:
                media_html = f'''                        <div class="news-media">
                            <img src="{item["media"]}" alt="Noticia Zonda" loading="lazy" style="width:100%; height:320px; object-fit:cover; border-radius:12px 12px 0 0; display:block;">
                        </div>'''
        
        text_html = f'<div class="news-body" style="padding: 22px;"><p style="font-size: 0.95rem; color: var(--text-primary); line-height: 1.6; margin:0;">{item.get("text", "")}</p></div>' if item.get("text") else ""
        
        article = f'''                    <article class="news-card visible">
{media_html}
{text_html}
                    </article>'''
        news_articles.append(article)
    
    if not news_articles:
        new_news_grid = '<div class="news-grid"><p style="color: var(--text-secondary); grid-column: 1/-1;">No hay noticias o promociones activas por el momento.</p></div>'
    else:
        new_news_grid = '<div class="news-grid">\n' + "\n".join(news_articles) + '\n                </div>'

    # 4. Regenerate FAQ
    faq_data = load_json(FAQ_JSON_PATH)
    faq_cards = []
    for item in faq_data:
        card = f'''                    <div class="faq-card">
                        <div class="faq-header">
                            <span class="faq-icon">{item.get("icon", "❓")}</span>
                            <h3>{item.get("title", "")}</h3>
                        </div>
                        <div class="faq-body">
                            {item.get("content", "")}
                        </div>
                    </div>'''
        faq_cards.append(card)
    new_faq_container = '<div class="faq-container">\n' + "\n".join(faq_cards) + '\n                </div>'

    with open(HTML_PATH, "r", encoding="utf-8") as f:
        html = f.read()
    
    html = re.sub(r'<!-- LOOKBOOK START -->.*?<!-- LOOKBOOK END -->', '<!-- LOOKBOOK START -->\n' + new_lb_grid + '\n<!-- LOOKBOOK END -->', html, flags=re.DOTALL)
    html = re.sub(r'<!-- CATALOGO START -->.*?<!-- CATALOGO END -->', '<!-- CATALOGO START -->\n' + new_cat_grid + '\n<!-- CATALOGO END -->', html, flags=re.DOTALL)
    html = re.sub(r'<!-- NOTICIAS START -->.*?<!-- NOTICIAS END -->', '<!-- NOTICIAS START -->\n' + new_news_grid + '\n<!-- NOTICIAS END -->', html, flags=re.DOTALL)
    html = re.sub(r'<!-- FAQ START -->.*?<!-- FAQ END -->', '<!-- FAQ START -->\n' + new_faq_container + '\n<!-- FAQ END -->', html, flags=re.DOTALL)
    
    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(html)


class ZondaHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        req_path = unquote(self.path)
        if req_path == '/admin':
            self.path = '/admin.html'
        elif req_path == '/api/lookbook':
            self.send_json(load_json(LOOKBOOK_JSON_PATH))
            return
        elif req_path == '/api/catalogo':
            self.send_json(load_json(CATALOGO_JSON_PATH))
            return
        elif req_path == '/api/noticias':
            self.send_json(load_json(NOTICIAS_JSON_PATH))
            return
        elif req_path.startswith('/api/reseñas') or req_path.startswith('/api/resenas'):
            self.send_json(load_json(RESEÑAS_JSON_PATH))
            return
        elif req_path.startswith('/api/pedidos'):
            self.send_json(load_json(PEDIDOS_JSON_PATH))
            return
        elif req_path.startswith('/api/faq'):
            self.send_json(load_json(FAQ_JSON_PATH))
            return
        return super().do_GET()

    def do_POST(self):
        req_path = unquote(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except:
            self.send_error(400, "Bad Request")
            return

        try:
            if req_path == '/api/login':
                self.handle_login(data)
            elif req_path == '/api/verify_session':
                token = data.get('token', '')
                self.send_json({'valid': token in ACTIVE_ADMIN_SESSIONS})
            elif req_path == '/api/upload_lookbook':
                self.handle_upload_lookbook(data)
            elif req_path == '/api/lookbook/update':
                self.handle_update_lookbook(data)
            elif req_path == '/api/lookbook/delete':
                self.handle_delete_lookbook(data)
                
            elif req_path == '/api/upload_catalogo':
                self.handle_upload_catalogo(data)
            elif req_path == '/api/catalogo/update':
                self.handle_update_catalogo(data)
            elif req_path == '/api/catalogo/delete':
                self.handle_delete_catalogo(data)
                
            elif req_path == '/api/upload_noticias' or req_path == '/api/news':
                self.handle_upload_noticias(data)
            elif req_path == '/api/noticias/update':
                self.handle_update_noticias(data)
            elif req_path == '/api/noticias/delete':
                self.handle_delete_noticias(data)
                
            elif req_path == '/api/reseñas' or req_path == '/api/resenas':
                self.handle_add_reseña(data)
            elif req_path == '/api/reseñas/update' or req_path == '/api/resenas/update':
                self.handle_update_reseña(data)
            elif req_path == '/api/reseñas/delete' or req_path == '/api/resenas/delete':
                self.handle_delete_reseña(data)

            elif req_path == '/api/faq/add':
                self.handle_add_faq(data)
            elif req_path == '/api/faq/update':
                self.handle_update_faq(data)
            elif req_path == '/api/faq/delete':
                self.handle_delete_faq(data)

            elif req_path == '/api/pedidos':
                self.handle_add_pedido(data)
            else:
                self.send_error(404, "Not Found")
        except Exception as e:
            self.send_error_json(str(e))

    def handle_login(self, data):
        pwd = data.get('password', '')
        if hashlib.sha256(pwd.encode('utf-8')).hexdigest() == ADMIN_PASSWORD_HASH:
            token = f"tok_{uuid.uuid4().hex}"
            ACTIVE_ADMIN_SESSIONS.add(token)
            self.send_json({'success': True, 'token': token})
        else:
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': 'Contraseña incorrecta'}).encode('utf-8'))

    def handle_add_reseña(self, data):
        name = data.get('name', 'Anónimo').strip() or 'Anónimo'
        rating = int(data.get('rating', 5))
        comment = data.get('comment', '').strip()
        if not comment: raise ValueError("Comentario requerido")

        items = load_json(RESEÑAS_JSON_PATH)
        items.insert(0, {
            "id": f"res_{uuid.uuid4().hex[:6]}",
            "name": name,
            "rating": min(5, max(1, rating)),
            "date": "Hoy",
            "comment": comment
        })
        save_json(RESEÑAS_JSON_PATH, items)
        self.send_success()

    def handle_update_reseña(self, data):
        res_id = data.get('id')
        items = load_json(RESEÑAS_JSON_PATH)
        for item in items:
            if item['id'] == res_id:
                if 'name' in data: item['name'] = data['name'].strip()
                if 'rating' in data: item['rating'] = int(data['rating'])
                if 'comment' in data: item['comment'] = data['comment'].strip()
                break
        save_json(RESEÑAS_JSON_PATH, items)
        self.send_success()

    def handle_delete_reseña(self, data):
        res_id = data.get('id')
        items = load_json(RESEÑAS_JSON_PATH)
        items = [item for item in items if item['id'] != res_id]
        save_json(RESEÑAS_JSON_PATH, items)
        self.send_success()

    def handle_add_faq(self, data):
        icon = data.get('icon', '❓').strip() or '❓'
        title = data.get('title', '').strip()
        category = data.get('category', 'General').strip()
        content = data.get('content', '').strip()
        if not title or not content: raise ValueError("Título y contenido requeridos")

        items = load_json(FAQ_JSON_PATH)
        items.append({
            "id": f"faq_{uuid.uuid4().hex[:6]}",
            "icon": icon,
            "title": title,
            "category": category,
            "content": content
        })
        save_json(FAQ_JSON_PATH, items)
        regenerate_html()
        self.send_success()

    def handle_update_faq(self, data):
        faq_id = data.get('id')
        items = load_json(FAQ_JSON_PATH)
        for item in items:
            if item['id'] == faq_id:
                if 'icon' in data: item['icon'] = data['icon'].strip()
                if 'title' in data: item['title'] = data['title'].strip()
                if 'category' in data: item['category'] = data['category'].strip()
                if 'content' in data: item['content'] = data['content'].strip()
                break
        save_json(FAQ_JSON_PATH, items)
        regenerate_html()
        self.send_success()

    def handle_delete_faq(self, data):
        faq_id = data.get('id')
        items = load_json(FAQ_JSON_PATH)
        items = [item for item in items if item['id'] != faq_id]
        save_json(FAQ_JSON_PATH, items)
        regenerate_html()
        self.send_success()

    def handle_add_pedido(self, data):
        items = load_json(PEDIDOS_JSON_PATH)
        items.insert(0, {
            "id": f"ped_{uuid.uuid4().hex[:6]}",
            "product_title": data.get('product_title', ''),
            "product_price": data.get('product_price', ''),
            "buyer_name": data.get('buyer_name', ''),
            "buyer_phone": data.get('buyer_phone', ''),
            "buyer_size": data.get('buyer_size', 'M'),
            "buyer_address": data.get('buyer_address', ''),
            "buyer_notes": data.get('buyer_notes', ''),
            "timestamp": uuid.uuid4().hex[:8]
        })
        save_json(PEDIDOS_JSON_PATH, items)
        self.send_success()


    def handle_upload_lookbook(self, data):
        image_b64 = data.get('image', '')
        desc = data.get('description', '')
        if not image_b64: raise ValueError("No image provided")

        new_filename = f"zonda_lookbook_{uuid.uuid4().hex[:8]}.webp"
        new_path = os.path.join(MODELOS_DIR, new_filename)
        self.process_image(image_b64, new_path)

        lb = load_json(LOOKBOOK_JSON_PATH)
        lb.insert(0, {
            "id": f"lb_{uuid.uuid4().hex[:6]}",
            "src": f"./modelos/{new_filename}",
            "description": desc.strip()
        })
        save_json(LOOKBOOK_JSON_PATH, lb)
        regenerate_html()
        self.send_success()

    def handle_update_lookbook(self, data):
        lb = load_json(LOOKBOOK_JSON_PATH)
        for item in lb:
            if item['id'] == data['id']:
                item['description'] = data.get('description', '').strip()
                break
        save_json(LOOKBOOK_JSON_PATH, lb)
        regenerate_html()
        self.send_success()

    def handle_delete_lookbook(self, data):
        lb = load_json(LOOKBOOK_JSON_PATH)
        new_lb = []
        for item in lb:
            if item['id'] == data['id']:
                try:
                    filepath = os.path.join(BASE_DIR, item['src'].replace("./", ""))
                    if os.path.exists(filepath): os.remove(filepath)
                except Exception: pass
            else:
                new_lb.append(item)
        save_json(LOOKBOOK_JSON_PATH, new_lb)
        regenerate_html()
        self.send_success()

    # --- CATALOGO ---
    def handle_upload_catalogo(self, data):
        image_b64 = data.get('image', '')
        title = data.get('title', 'Prenda Zonda')
        price = data.get('price', '$0')
        if not image_b64: raise ValueError("No image provided")

        new_filename = f"zonda_cat_{uuid.uuid4().hex[:8]}.webp"
        new_path = os.path.join(FOTOS_DIR, new_filename)
        self.process_image(image_b64, new_path, crop=False)

        cat = load_json(CATALOGO_JSON_PATH)
        cat.insert(0, {
            "id": f"cat_{uuid.uuid4().hex[:6]}",
            "src": f"fotos/{new_filename}",
            "title": title.strip(),
            "price": price.strip()
        })
        save_json(CATALOGO_JSON_PATH, cat)
        regenerate_html()
        self.send_success()

    def handle_update_catalogo(self, data):
        cat = load_json(CATALOGO_JSON_PATH)
        for item in cat:
            if item['id'] == data['id']:
                item['title'] = data.get('title', '').strip()
                item['price'] = data.get('price', '').strip()
                break
        save_json(CATALOGO_JSON_PATH, cat)
        regenerate_html()
        self.send_success()

    def handle_delete_catalogo(self, data):
        cat = load_json(CATALOGO_JSON_PATH)
        new_cat = []
        for item in cat:
            if item['id'] == data['id']:
                try:
                    filepath = os.path.join(BASE_DIR, item['src'])
                    if os.path.exists(filepath): os.remove(filepath)
                except Exception: pass
            else:
                new_cat.append(item)
        save_json(CATALOGO_JSON_PATH, new_cat)
        regenerate_html()
        self.send_success()

    # --- NOTICIAS ---
    def handle_upload_noticias(self, data):
        text = data.get('text', '').strip()
        media_b64 = data.get('media', '')
        media_type = data.get('media_type', '')
        if not text and not media_b64:
            raise ValueError("Debe incluir texto o un archivo multimedia")

        media_url = ""
        if media_b64:
            media_data = base64.b64decode(media_b64)
            ext = "mp4" if "video" in media_type else "webp"
            new_filename = f"news_{uuid.uuid4().hex[:8]}.{ext}"
            new_path = os.path.join(NEWS_DIR, new_filename)
            with open(new_path, "wb") as f:
                f.write(media_data)
            media_url = f"news_media/{new_filename}"

        news = load_json(NOTICIAS_JSON_PATH)
        news.insert(0, {
            "id": f"news_{uuid.uuid4().hex[:6]}",
            "text": text,
            "media": media_url,
            "media_type": media_type
        })
        save_json(NOTICIAS_JSON_PATH, news)
        regenerate_html()
        self.send_success()

    def handle_update_noticias(self, data):
        news_id = data.get('id')
        text = data.get('text', '').strip()
        media_b64 = data.get('media', '')
        media_type = data.get('media_type', '')

        news = load_json(NOTICIAS_JSON_PATH)
        for item in news:
            if item['id'] == news_id:
                item['text'] = text
                if media_b64:
                    if item.get('media'):
                        try:
                            old_path = os.path.join(BASE_DIR, item['media'])
                            if os.path.exists(old_path): os.remove(old_path)
                        except Exception: pass
                    
                    media_data = base64.b64decode(media_b64)
                    ext = "mp4" if "video" in media_type else "webp"
                    new_filename = f"news_{uuid.uuid4().hex[:8]}.{ext}"
                    new_path = os.path.join(NEWS_DIR, new_filename)
                    with open(new_path, "wb") as f:
                        f.write(media_data)
                    item['media'] = f"news_media/{new_filename}"
                    item['media_type'] = media_type
                break
        save_json(NOTICIAS_JSON_PATH, news)
        regenerate_html()
        self.send_success()

    def handle_delete_noticias(self, data):
        news_id = data.get('id')
        news = load_json(NOTICIAS_JSON_PATH)
        new_news = []
        for item in news:
            if item['id'] == news_id:
                if item.get('media'):
                    try:
                        filepath = os.path.join(BASE_DIR, item['media'])
                        if os.path.exists(filepath): os.remove(filepath)
                    except Exception: pass
            else:
                new_news.append(item)
        save_json(NOTICIAS_JSON_PATH, new_news)
        regenerate_html()
        self.send_success()

    def process_image(self, b64, out_path, crop=True):
        image_data = base64.b64decode(b64)
        temp_path = out_path + ".tmp"
        with open(temp_path, "wb") as f:
            f.write(image_data)
        
        with Image.open(temp_path) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.05)
            if crop:
                img = ImageOps.fit(img, (800, 1000), method=Image.Resampling.LANCZOS)
            img.save(out_path, "WEBP", quality=85)
        os.remove(temp_path)

    def send_success(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
        
    def send_error_json(self, msg):
        self.send_response(500)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'success': False, 'error': msg}).encode('utf-8'))
        
    def send_json(self, obj):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(obj).encode('utf-8'))

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), ZondaHandler) as httpd:
        print(f"Server started at http://localhost:{PORT}")
        httpd.serve_forever()
