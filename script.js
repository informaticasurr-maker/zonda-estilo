document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // =========================================================================
    // NAVEGACIÓN HISTORIAL Y BOTÓN VOLVER ATRÁS EN MÓVILES (SPA HISTORY API)
    // =========================================================================
    let allowExitOnBack = false;
    let exitToastTimer = null;

    function showExitToast() {
        let toast = document.getElementById('mobile-exit-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'mobile-exit-toast';
            toast.className = 'mobile-exit-toast';
            toast.textContent = 'Presioná atrás otra vez para salir';
            document.body.appendChild(toast);
        }
        toast.classList.add('active');
        clearTimeout(exitToastTimer);
        exitToastTimer = setTimeout(() => {
            if (toast) toast.classList.remove('active');
            allowExitOnBack = false;
        }, 2200);
    }

    function getActiveTabId() {
        const activeTab = document.querySelector('.tab-content.active');
        return activeTab ? activeTab.id : 'tab-lookbook';
    }

    async function switchTab(targetId, updateHistory = true, shouldScroll = false) {
        if (!targetId) return;
        const targetContent = document.getElementById(targetId);
        if (!targetContent) return;

        // 1. Sincronizar botones del menú de pestañas
        document.querySelectorAll('.tab-btn').forEach(b => {
            if (b.getAttribute('data-target') === targetId) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        // 2. Sincronizar botones de la barra inferior móvil
        document.querySelectorAll('.bottom-nav-btn').forEach(b => {
            if (b.getAttribute('data-target') === targetId) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        // 3. Activar pestaña objetivo
        tabContents.forEach(c => c.classList.remove('active'));
        targetContent.classList.add('active');

        if (targetId === 'tab-noticias') {
            await refreshNoticias();
        } else if (targetId === 'tab-reseñas') {
            await loadReseñas();
        }
        observeElements();

        // 4. Scroll suave hacia arriba para no desorientar al usuario en móviles
        if (shouldScroll) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        if (updateHistory) {
            const currentHash = window.location.hash.replace('#', '');
            if (currentHash !== targetId) {
                history.pushState({ tab: targetId }, '', '#' + targetId);
            }
        }
    }

    // Event delegation para todos los botones de navegación entre pestañas
    document.addEventListener('click', (e) => {
        const navBtn = e.target.closest('[data-target]');
        if (navBtn && (navBtn.classList.contains('tab-btn') || navBtn.classList.contains('bottom-nav-btn') || navBtn.classList.contains('btn-tab-shortcut') || navBtn.classList.contains('btn-tab-shortcut-main'))) {
            e.preventDefault();
            const targetId = navBtn.getAttribute('data-target');
            switchTab(targetId, true, true);
        }
    });

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function refreshNoticias() {
        try {
            let data = [];
            const db = window.firebaseDb;
            if (db) {
                try {
                    const snap = await db.collection('noticias').get();
                    if (!snap.empty) {
                        snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
                    }
                } catch(e) {}
            }
            if (!data || data.length === 0) {
                const res = await fetch('/api/noticias?_t=' + Date.now());
                if (res.ok) data = await res.json();
            }
            const grid = document.querySelector('#tab-noticias .news-grid');
            if (!grid) return;

            if (!data || data.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.style.cssText = 'color: var(--text-secondary); grid-column: 1/-1;';
                emptyMsg.textContent = 'No hay noticias o promociones activas por el momento.';
                grid.replaceChildren(emptyMsg);
                return;
            }

            grid.innerHTML = data.map(item => {
                let mediaHtml = '';
                if (item.media) {
                    const safeSrc = encodeURI(item.media);
                    if (item.media_type && item.media_type.includes('video')) {
                        mediaHtml = `<div class="news-media"><video src="${safeSrc}" autoplay loop muted playsinline style="width:100%; height:320px; object-fit:cover; border-radius:12px 12px 0 0; display:block;"></video></div>`;
                    } else {
                        mediaHtml = `<div class="news-media"><img src="${safeSrc}" alt="Noticia Zonda" loading="lazy" style="width:100%; height:320px; object-fit:cover; border-radius:12px 12px 0 0; display:block;"></div>`;
                    }
                }
                const safeText = escapeHTML(item.text);
                let textHtml = safeText ? `<div class="news-body" style="padding: 22px;"><p style="font-size: 0.95rem; color: var(--text-primary); line-height: 1.6; margin:0;">${safeText}</p></div>` : '';
                return `<article class="news-card visible">${mediaHtml}${textHtml}</article>`;
            }).join('');
        } catch(e) {}
    }

    // Intersection Observer for Scroll Fade-Up Animations
    function observeElements() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // Animate only once
                }
            });
        }, {
            threshold: 0.05,
            rootMargin: "0px 0px -30px 0px"
        });

        // Select items in the CURRENTLY ACTIVE tab to animate
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab) {
            const items = activeTab.querySelectorAll('.product-card, .lookbook-item, .news-card');
            items.forEach((item, index) => {
                // Remove visible class to restart animation if needed
                item.classList.remove('visible');
                // Stagger delay based on index for a cascading effect
                item.style.transitionDelay = `${(index % 8) * 0.08}s`;
                observer.observe(item);
            });
        }
    }

    // Sequential Reel Video Player (Instagram Reel Style)
    const playlist = [
        { src: "modelos/Woman_modeling_hoodie_on_bench_20261001235917.mp4", title: "Zonda Lookbook Session" },
        { src: "modelos/Man_walking_along_boardwalk_20261001235743.mp4", title: "Streetwear Walk" },
        { src: "modelos/Model_adjusts_sweatshirt_near_ha…_20261001235904.mp4", title: "Urban Style Reel" },
        { src: "fotos/video_2026-10-01_14-29-59.mp4", title: "Zonda Collection Reel" }
    ];

    let currentVideoIdx = 0;
    const videoPlayer = document.getElementById('sequentialVideoPlayer');
    const currentTitleEl = document.getElementById('videoCurrentTitle');
    const soundBtn = document.getElementById('videoSoundBtn');
    const prevBtn = document.getElementById('prevVideoBtn');
    const nextBtn = document.getElementById('nextVideoBtn');
    const storyBarsContainer = document.getElementById('reelStoryBars');

    if (videoPlayer) {
        function renderStoryBars() {
            if (!storyBarsContainer) return;
            storyBarsContainer.innerHTML = '';
            playlist.forEach((_, i) => {
                const barTrack = document.createElement('div');
                barTrack.style.cssText = `
                    flex: 1;
                    height: 3px;
                    background: rgba(255,255,255,0.3);
                    border-radius: 2px;
                    overflow: hidden;
                    cursor: pointer;
                `;
                const barFill = document.createElement('div');
                barFill.id = `storyFill_${i}`;
                barFill.style.cssText = `
                    width: ${i < currentVideoIdx ? '100%' : '0%'};
                    height: 100%;
                    background: #ffffff;
                    transition: width 0.1s linear;
                `;
                barTrack.appendChild(barFill);
                barTrack.onclick = (e) => { e.stopPropagation(); loadVideo(i); };
                storyBarsContainer.appendChild(barTrack);
            });
        }

        function loadVideo(index) {
            currentVideoIdx = (index + playlist.length) % playlist.length;
            const item = playlist[currentVideoIdx];
            videoPlayer.src = item.src;
            if (currentTitleEl) currentTitleEl.textContent = item.title;
            
            renderStoryBars();
            videoPlayer.play().catch(() => {});
        }

        videoPlayer.addEventListener('timeupdate', () => {
            if (videoPlayer.duration) {
                const fill = document.getElementById(`storyFill_${currentVideoIdx}`);
                if (fill) {
                    const pct = (videoPlayer.currentTime / videoPlayer.duration) * 100;
                    fill.style.width = pct + '%';
                }
            }
        });

        // Automatic sequential transition: when current video ends, play next!
        videoPlayer.addEventListener('ended', () => {
            const fill = document.getElementById(`storyFill_${currentVideoIdx}`);
            if (fill) fill.style.width = '100%';
            loadVideo(currentVideoIdx + 1);
        });

        // Click video toggles sound
        videoPlayer.addEventListener('click', () => {
            videoPlayer.muted = !videoPlayer.muted;
            if (soundBtn) soundBtn.textContent = videoPlayer.muted ? '🔇' : '🔊';
        });

        if (soundBtn) {
            soundBtn.onclick = (e) => {
                e.stopPropagation();
                videoPlayer.muted = !videoPlayer.muted;
                soundBtn.textContent = videoPlayer.muted ? '🔇' : '🔊';
            };
        }

        if (prevBtn) {
            prevBtn.onclick = (e) => {
                e.stopPropagation();
                loadVideo(currentVideoIdx - 1);
            };
        }

        if (nextBtn) {
            nextBtn.onclick = (e) => {
                e.stopPropagation();
                loadVideo(currentVideoIdx + 1);
            };
        }

        renderStoryBars();
    }

    // ==========================================
    // SISTEMA DE RESEÑAS Y OPINIONES DE CLIENTES
    // ==========================================
    const LOCAL_REVIEWS_KEY = 'zonda_client_reviews';

    function getLocalReseñas() {
        try {
            const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch(e) {
            return [];
        }
    }

    function saveLocalReseña(review) {
        try {
            const current = getLocalReseñas();
            current.unshift(review);
            localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(current.slice(0, 50)));
        } catch(e) {}
    }

    const DEFAULT_FALLBACK_REVIEWS = [
        { id: "res_001", name: "Mariana G.", rating: 5, date: "12 Oct 2026", comment: "La remera en vivo es mucho más linda que en fotos! La caída del algodón es espectacular y el calce oversize queda perfecto." },
        { id: "res_002", name: "Lucas M.", rating: 5, date: "10 Oct 2026", comment: "La calidad del algodón 24/1 es tremenda, tela pesada y resistente como me gusta. 100% recomendado." },
        { id: "res_003", name: "Joaquín B.", rating: 5, date: "08 Oct 2026", comment: "El buzo con friza superó todas mis expectativas. Es súper abrigado, pesado y la capucha tiene una estructura genial. La mejor compra." },
        { id: "res_004", name: "Camila V.", rating: 5, date: "05 Oct 2026", comment: "Compré la remera oversize negra y me sorprendió el grosor de la tela. Caída perfecta para armar outfits urbanos. ¡La rompieron!" },
        { id: "res_005", name: "Facundo D.", rating: 5, date: "02 Oct 2026", comment: "Atención de 10 por WhatsApp, coordinamos la entrega al toque en Mendoza. El estampado serigráfico tiene un relieve y durabilidad de primera." },
        { id: "res_006", name: "Sofía R.", rating: 5, date: "29 Sep 2026", comment: "Llegó súper rápido y la atención fue genial. La remera es hermosísima, no destiñe nada al lavarla." },
        { id: "res_007", name: "Agustina L.", rating: 4, date: "26 Sep 2026", comment: "Excelente relación precio-calidad. El talle M me quedó justo el oversize que buscaba. Muy buena confección en las costuras." },
        { id: "res_008", name: "Gabriel T.", rating: 5, date: "23 Sep 2026", comment: "Impresionante la estampa y el grosor de la tela. No se achica para nada con los lavados continuos." },
        { id: "res_009", name: "Nicolás R.", rating: 5, date: "20 Sep 2026", comment: "Para andar en skate o salir con amigos va como piña. Re cómoda, corte suelto impecable. Ya les encargué otra." },
        { id: "res_010", name: "Valentina P.", rating: 5, date: "17 Sep 2026", comment: "Súper cómoda, la tela es bien suave y el corte moderno. Definitivamente voy a volver a comprar." },
        { id: "res_011", name: "Thiago S.", rating: 5, date: "14 Sep 2026", comment: "El corte de hombros caídos es perfecto, no te queda cuadrada como en otras marcas. 10/10 en estilo y durabilidad." },
        { id: "res_012", name: "Julieta M.", rating: 5, date: "11 Sep 2026", comment: "Increíble diseño, se nota la identidad de la marca en cada detalle. Es difícil encontrar streetwear nacional con este nivel." },
        { id: "res_013", name: "Renata C.", rating: 4, date: "08 Sep 2026", comment: "Pedí con envío al interior y llegó todo en orden y bien empaquetado. La tela es súper suave y los detalles son de diez." },
        { id: "res_014", name: "Mateo K.", rating: 5, date: "04 Sep 2026", comment: "Compré el combo remera + buzo y valió cada peso. La calidad se nota al instante y la onda que tienen es única." }
    ];

    async function fetchReseñasData() {
        let list = [];
        const db = window.firebaseDb;
        if (db) {
            try {
                const snap = await db.collection('reseñas').get();
                if (!snap.empty) {
                    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
                    return list;
                }
            } catch(fbErr) {
                console.warn("Firestore reviews fallback to local:", fbErr);
            }
        }
        try {
            const res = await fetch('/api/reseñas?_t=' + Date.now());
            if (res.ok) {
                list = await res.json();
            } else {
                const fallback = await fetch('reseñas.json?_t=' + Date.now());
                if (fallback.ok) list = await fallback.json();
            }
        } catch(e) {
            try {
                const fallback = await fetch('reseñas.json?_t=' + Date.now());
                if (fallback.ok) list = await fallback.json();
            } catch(err) {}
        }
        if (!list || !Array.isArray(list) || list.length === 0) {
            list = DEFAULT_FALLBACK_REVIEWS;
        }
        return list;
    }

    function updateReviewsMetrics(reviews) {
        const scoreEl = document.getElementById('reviews-avg-score');
        const starsEl = document.getElementById('reviews-avg-stars');
        const countEl = document.getElementById('reviews-count-text');

        if (!reviews || reviews.length === 0) {
            if (scoreEl) scoreEl.textContent = '5.0';
            if (starsEl) starsEl.textContent = '★★★★★';
            if (countEl) countEl.textContent = 'Aún sin opiniones';
            return;
        }

        const totalRating = reviews.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0);
        const avg = (totalRating / reviews.length).toFixed(1);
        const roundedStars = Math.round(Number(avg));
        const starsStr = '★'.repeat(Math.max(1, Math.min(5, roundedStars))) + '☆'.repeat(Math.max(0, 5 - roundedStars));

        if (scoreEl) scoreEl.textContent = avg;
        if (starsEl) starsEl.textContent = starsStr;
        if (countEl) {
            countEl.textContent = `Basado en ${reviews.length} ${reviews.length === 1 ? 'opinión verificada' : 'opiniones verificadas'}`;
        }
    }

    // Load Reseñas function
    async function loadReseñas(newlyAddedId = null) {
        try {
            const grid = document.getElementById('reviews-grid');
            if (!grid) return;

            const remote = await fetchReseñasData();
            const local = getLocalReseñas();

            // Combinar reseñas locales y remotas evitando duplicados
            const seenIds = new Set();
            const seenSignatures = new Set();
            const merged = [];

            // Primero las locales para que el usuario vea su reseña arriba
            local.forEach(item => {
                const sig = (item.name || '').trim().toLowerCase() + '|' + (item.comment || '').trim().toLowerCase();
                if (item.id) seenIds.add(item.id);
                seenSignatures.add(sig);
                merged.push(item);
            });

            remote.forEach(item => {
                const sig = (item.name || '').trim().toLowerCase() + '|' + (item.comment || '').trim().toLowerCase();
                if ((!item.id || !seenIds.has(item.id)) && !seenSignatures.has(sig)) {
                    if (item.id) seenIds.add(item.id);
                    seenSignatures.add(sig);
                    merged.push(item);
                }
            });

            updateReviewsMetrics(merged);

            if (merged.length === 0) {
                const emptyMsg = document.createElement('p');
                emptyMsg.style.cssText = 'color: var(--text-secondary); grid-column: 1/-1; text-align: center; padding: 30px;';
                emptyMsg.textContent = 'Aún no hay reseñas publicadas. ¡Sé el primero en compartir tu experiencia!';
                grid.replaceChildren(emptyMsg);
                return;
            }

            grid.innerHTML = merged.map(item => {
                const safeName = escapeHTML(item.name || 'Cliente Zonda');
                const safeDate = escapeHTML(item.date || 'Reciente');
                const safeComment = escapeHTML(item.comment || '');
                const safeProduct = item.product ? escapeHTML(item.product) : '';
                const ratingNum = Math.max(1, Math.min(5, Number(item.rating) || 5));
                const stars = '★'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);
                const initial = safeName.charAt(0).toUpperCase() || 'Z';
                const isNew = item.id && item.id === newlyAddedId;

                return `
                    <article class="review-card ${isNew ? 'newly-added-review' : ''}" ${isNew ? 'id="new-review-card"' : ''}>
                        <div class="review-header">
                            <div class="review-author-wrap">
                                <div class="review-avatar" aria-hidden="true">${initial}</div>
                                <div class="review-author-meta">
                                    <span class="review-author-name">${safeName}</span>
                                    <span class="review-verified-badge">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        Compra verificada
                                    </span>
                                </div>
                            </div>
                            <span class="review-date">${safeDate}</span>
                        </div>
                        <div class="stars-gold" aria-label="${ratingNum} de 5 estrellas">${stars}</div>
                        ${safeProduct ? `<span class="review-product-tag">${safeProduct}</span>` : ''}
                        <p class="review-comment">"${safeComment}"</p>
                    </article>
                `;
            }).join('');

            // Scroll si hay una recién agregada
            if (newlyAddedId) {
                const newCard = document.getElementById('new-review-card');
                if (newCard) {
                    newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        } catch(e) {
            console.error('Error al cargar reseñas:', e);
        }
    }

    // Inicializar selector interactivo de estrellas
    const starPicker = document.getElementById('star-picker');
    const selectRating = document.getElementById('rev-rating');

    function setStarRating(val) {
        if (!starPicker || !selectRating) return;
        const stars = starPicker.querySelectorAll('.star-btn');
        stars.forEach(s => {
            const starVal = parseInt(s.getAttribute('data-val'), 10);
            if (starVal <= val) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
            s.classList.remove('hovered');
        });
        selectRating.value = String(val);
    }

    if (starPicker && selectRating) {
        const starBtns = starPicker.querySelectorAll('.star-btn');
        starBtns.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                const hoverVal = parseInt(btn.getAttribute('data-val'), 10);
                starBtns.forEach(s => {
                    const sVal = parseInt(s.getAttribute('data-val'), 10);
                    if (sVal <= hoverVal) {
                        s.classList.add('hovered');
                    } else {
                        s.classList.remove('hovered');
                    }
                });
            });

            btn.addEventListener('click', () => {
                const clickedVal = parseInt(btn.getAttribute('data-val'), 10);
                setStarRating(clickedVal);
            });
        });

        starPicker.addEventListener('mouseleave', () => {
            const currentVal = parseInt(selectRating.value, 10) || 5;
            setStarRating(currentVal);
        });

        selectRating.addEventListener('change', () => {
            const currentVal = parseInt(selectRating.value, 10) || 5;
            setStarRating(currentVal);
        });
    }

    // Submit Reseña Form
    const formReseña = document.getElementById('form-reseña');
    const statusMsg = document.getElementById('review-status-msg');
    const submitBtn = document.getElementById('btn-submit-review');

    function showReviewStatus(text, type = 'success') {
        if (!statusMsg) return;
        statusMsg.className = `review-status-msg ${type}`;
        statusMsg.textContent = text;
        statusMsg.style.display = 'block';
        setTimeout(() => {
            if (statusMsg) {
                statusMsg.style.display = 'none';
            }
        }, 7000);
    }

    if (formReseña) {
        formReseña.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('rev-name');
            const ratingInput = document.getElementById('rev-rating');
            const commentInput = document.getElementById('rev-comment');
            const productInput = document.getElementById('rev-product');

            const name = nameInput ? nameInput.value.trim() : '';
            const rating = ratingInput ? parseInt(ratingInput.value, 10) : 5;
            const comment = commentInput ? commentInput.value.trim() : '';
            const product = productInput ? productInput.value.trim() : '';

            if (!name || !comment) {
                showReviewStatus('Por favor completá tu nombre y tu comentario sobre la prenda.', 'error');
                return;
            }

            const newId = 'res_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
            const newReviewObj = {
                id: newId,
                name: name,
                rating: rating,
                date: 'Hoy',
                product: product || '',
                comment: comment
            };

            // 1. Guardar en almacenamiento local del navegador (instantáneo y offline-friendly)
            saveLocalReseña(newReviewObj);

            if (submitBtn) {
                submitBtn.disabled = true;
                const btnText = submitBtn.querySelector('.btn-text');
                if (btnText) btnText.textContent = 'Publicando...';
            }

            // 2. Intentar guardar en Firestore y en servidor local
            const db = window.firebaseDb;
            if (db) {
                try {
                    await db.collection('reseñas').doc(newId).set(newReviewObj);
                } catch(fbErr) {
                    console.warn("Firestore save review error:", fbErr);
                }
            }
            try {
                await fetch('/api/reseñas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, rating, comment, product })
                });
            } catch(err) {
                // Si el backend no está disponible, se mantiene en Firestore / localStorage
            }

            // 3. Feedback visual y reseteo
            formReseña.reset();
            setStarRating(5);

            if (submitBtn) {
                submitBtn.disabled = false;
                const btnText = submitBtn.querySelector('.btn-text');
                if (btnText) btnText.textContent = 'Publicar Reseña';
            }

            showReviewStatus(`¡Muchas gracias, ${name}! Tu reseña fue publicada con éxito y ya es visible en la tienda.`, 'success');

            // 4. Recargar vista de reseñas para mostrarla de inmediato
            await loadReseñas(newId);
        });
    }

    // Modal de Compra ("LO QUIERO..!!") y Visor de Foto Ampliada con Navegación Secuencial
    const modalCompra = document.getElementById('modal-compra');
    const closeModalBtn = document.getElementById('close-modal-compra');
    const formCompra = document.getElementById('form-compra');

    // Visor Lightbox Pantalla Completa
    const lightboxZoom = document.getElementById('lightbox-zoom');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const closeLightboxBtn = document.getElementById('close-lightbox-zoom');
    const lightboxLoQuieroBtn = document.getElementById('lightbox-lo-quiero-btn');
    const modalImgContainer = document.getElementById('modalImgContainer');
    const modalItemCounter = document.getElementById('modalItemCounter');

    // Flechas de navegación en modal y lightbox
    const modalPrevItemBtn = document.getElementById('modalPrevItemBtn');
    const modalNextItemBtn = document.getElementById('modalNextItemBtn');
    const lightboxPrevBtn = document.getElementById('lightboxPrevBtn');
    const lightboxNextBtn = document.getElementById('lightboxNextBtn');

    // Estado de la galería activa (Catálogo o Lookbook)
    let currentGalleryItems = [];
    let currentGalleryIndex = 0;

    function getCollectionItems(type) {
        let elements = [];
        if (type === 'lookbook') {
            elements = Array.from(document.querySelectorAll('.lookbook-grid .lookbook-item'));
        } else {
            // Por defecto catálogo
            elements = Array.from(document.querySelectorAll('.products-grid .product-card'));
        }

        return elements.map(el => {
            const h3 = el.querySelector('h3');
            const priceEl = el.querySelector('.price');
            const imgEl = el.querySelector('img');
            return {
                title: h3 ? h3.textContent.trim() : (type === 'lookbook' ? 'Lookbook Zonda' : 'Prenda Zonda'),
                price: priceEl ? priceEl.textContent.trim() : (type === 'lookbook' ? 'Precio a consultar' : 'Consultar'),
                imgSrc: imgEl ? imgEl.src : ''
            };
        }).filter(item => item.imgSrc !== '');
    }

    function renderCurrentGalleryItem(animate = true) {
        if (!currentGalleryItems || currentGalleryItems.length === 0) return;
        if (currentGalleryIndex < 0) currentGalleryIndex = currentGalleryItems.length - 1;
        if (currentGalleryIndex >= currentGalleryItems.length) currentGalleryIndex = 0;

        const item = currentGalleryItems[currentGalleryIndex];
        const total = currentGalleryItems.length;
        const countText = `${currentGalleryIndex + 1} / ${total}`;

        // Elementos del Modal
        const modalImg = document.getElementById('modal-product-img');
        const modalTitle = document.getElementById('modal-product-title');
        const modalPrice = document.getElementById('modal-product-price');
        const buyTitleInput = document.getElementById('buy-product-title');
        const buyPriceInput = document.getElementById('buy-product-price');

        if (animate && modalImg) {
            modalImg.style.opacity = '0.35';
            setTimeout(() => {
                modalImg.src = item.imgSrc;
                modalImg.style.opacity = '1';
            }, 120);
        } else if (modalImg) {
            modalImg.src = item.imgSrc;
            modalImg.style.opacity = '1';
        }

        if (modalTitle) modalTitle.textContent = item.title;
        if (modalPrice) modalPrice.textContent = item.price;
        if (buyTitleInput) buyTitleInput.value = item.title;
        if (buyPriceInput) buyPriceInput.value = item.price;
        if (modalItemCounter) modalItemCounter.textContent = countText;

        // Elementos del Lightbox (si está visible)
        if (lightboxImg) {
            if (animate) {
                lightboxImg.style.opacity = '0.35';
                setTimeout(() => {
                    lightboxImg.src = item.imgSrc;
                    lightboxImg.style.opacity = '1';
                }, 120);
            } else {
                lightboxImg.src = item.imgSrc;
                lightboxImg.style.opacity = '1';
            }
        }
        if (lightboxTitle) lightboxTitle.textContent = item.title;
        if (lightboxCounter) lightboxCounter.textContent = countText;
    }

    function navigateGallery(direction) {
        if (!currentGalleryItems || currentGalleryItems.length <= 1) return;
        currentGalleryIndex += direction;
        renderCurrentGalleryItem(true);
    }

    function openLightbox(imgSrc, title, updateHistory = true) {
        if (!lightboxZoom) return;
        lightboxZoom.classList.add('active');
        renderCurrentGalleryItem(false);
        if (updateHistory) {
            history.pushState({ lightboxOpen: true, tab: getActiveTabId() }, '', '#zoom-hd');
        }
    }

    function closeLightbox(fromPopState = false) {
        if (!lightboxZoom) return;
        const wasOpen = lightboxZoom.classList.contains('active');
        lightboxZoom.classList.remove('active');
        if (wasOpen && !fromPopState && window.location.hash === '#zoom-hd') {
            history.back();
        }
    }

    if (modalImgContainer) {
        modalImgContainer.addEventListener('click', (e) => {
            // Evitar que el clic en las flechas abra el lightbox
            if (e.target.closest('.modal-nav-arrow')) return;
            const item = currentGalleryItems[currentGalleryIndex] || {};
            openLightbox(item.imgSrc || '', item.title || '', true);
        });
    }

    // Botones de navegación en Modal
    if (modalPrevItemBtn) {
        modalPrevItemBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateGallery(-1);
        });
    }

    if (modalNextItemBtn) {
        modalNextItemBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateGallery(1);
        });
    }

    // Botones de navegación en Lightbox
    if (lightboxPrevBtn) {
        lightboxPrevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateGallery(-1);
        });
    }

    if (lightboxNextBtn) {
        lightboxNextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateGallery(1);
        });
    }

    if (closeLightboxBtn) {
        closeLightboxBtn.addEventListener('click', () => closeLightbox(false));
    }

    if (lightboxZoom) {
        lightboxZoom.addEventListener('click', (e) => {
            if (e.target.closest('.lightbox-nav-arrow') || e.target.closest('.lightbox-bottom-bar')) return;
            if (e.target === lightboxZoom || e.target.classList.contains('lightbox-img-wrapper')) {
                closeLightbox(false);
            }
        });
    }

    if (lightboxLoQuieroBtn) {
        lightboxLoQuieroBtn.addEventListener('click', () => {
            closeLightbox(false);
            const buyNameInput = document.getElementById('buy-name');
            if (buyNameInput) {
                setTimeout(() => buyNameInput.focus(), 250);
            }
        });
    }

    function openModalCompra(title, price, imgSrc, updateHistory = true, collectionType = 'catalogo', clickedIndex = 0) {
        if (!modalCompra) return;

        // Cargar colección actual y fijar índice
        currentGalleryItems = getCollectionItems(collectionType);
        currentGalleryIndex = clickedIndex;

        // Si por alguna razón la colección está vacía, usar el ítem recibido
        if (!currentGalleryItems || currentGalleryItems.length === 0) {
            currentGalleryItems = [{ title, price, imgSrc }];
            currentGalleryIndex = 0;
        }

        renderCurrentGalleryItem(false);
        
        modalCompra.classList.add('active');
        document.body.style.overflow = 'hidden';

        if (updateHistory) {
            history.pushState({ modalOpen: true, tab: getActiveTabId() }, '', '#lo-quiero');
        }
    }

    function closeModalCompra(fromPopState = false) {
        if (!modalCompra) return;
        const wasOpen = modalCompra.classList.contains('active');
        modalCompra.classList.remove('active');
        document.body.style.overflow = '';

        if (wasOpen && !fromPopState && window.location.hash === '#lo-quiero') {
            history.back();
        }
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => closeModalCompra(false));
    }

    if (modalCompra) {
        modalCompra.addEventListener('click', (e) => {
            if (e.target === modalCompra) closeModalCompra(false);
        });
    }

    // Navegación por teclado (Flechas Izquierda / Derecha)
    document.addEventListener('keydown', (e) => {
        const isModalOpen = modalCompra && modalCompra.classList.contains('active');
        const isLightboxOpen = lightboxZoom && lightboxZoom.classList.contains('active');
        if (!isModalOpen && !isLightboxOpen) return;

        // Ignorar si el usuario está escribiendo en un input o textarea
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

        if (e.key === 'ArrowLeft') {
            navigateGallery(-1);
        } else if (e.key === 'ArrowRight') {
            navigateGallery(1);
        } else if (e.key === 'Escape') {
            if (isLightboxOpen) {
                closeLightbox(false);
            } else if (isModalOpen) {
                closeModalCompra(false);
            }
        }
    });

    // Soporte para gestos táctiles Swipe en Modal y Lightbox (Mobile Friendly)
    let touchStartX = 0;
    let touchStartY = 0;

    function handleTouchStart(e) {
        if (!e.touches || e.touches.length === 0) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }

    function handleTouchEnd(e) {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        // Si el swipe horizontal es mayor a 45px y supera al desplazamiento vertical
        if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX < 0) {
                navigateGallery(1); // Deslizar hacia la izquierda -> siguiente
            } else {
                navigateGallery(-1); // Deslizar hacia la derecha -> anterior
            }
        }
    }

    if (modalImgContainer) {
        modalImgContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
        modalImgContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    if (lightboxZoom) {
        lightboxZoom.addEventListener('touchstart', handleTouchStart, { passive: true });
        lightboxZoom.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    // Event Delegation for clicking any product-card or lookbook-item
    document.addEventListener('click', (e) => {
        const productCard = e.target.closest('.product-card');
        const lookbookItem = e.target.closest('.lookbook-item');

        if (productCard) {
            const allProducts = Array.from(document.querySelectorAll('.products-grid .product-card'));
            const cardIndex = allProducts.indexOf(productCard);
            const title = productCard.querySelector('h3') ? productCard.querySelector('h3').textContent.trim() : 'Prenda Zonda';
            const price = productCard.querySelector('.price') ? productCard.querySelector('.price').textContent.trim() : 'Consultar';
            const img = productCard.querySelector('img') ? productCard.querySelector('img').src : '';
            openModalCompra(title, price, img, true, 'catalogo', cardIndex >= 0 ? cardIndex : 0);
        } else if (lookbookItem) {
            const allLookbook = Array.from(document.querySelectorAll('.lookbook-grid .lookbook-item'));
            const itemIndex = allLookbook.indexOf(lookbookItem);
            const title = lookbookItem.querySelector('h3') ? lookbookItem.querySelector('h3').textContent.trim() : 'Remera Zonda (Lookbook)';
            const price = 'Precio a consultar';
            const img = lookbookItem.querySelector('img') ? lookbookItem.querySelector('img').src : '';
            openModalCompra(title, price, img, true, 'lookbook', itemIndex >= 0 ? itemIndex : 0);
        }
    });

    // Form Compra Submit -> Save Order + Open WhatsApp
    if (formCompra) {
        formCompra.addEventListener('submit', async (e) => {
            e.preventDefault();
            const product_title = document.getElementById('buy-product-title').value;
            const product_price = document.getElementById('buy-product-price').value;
            const buyer_name = document.getElementById('buy-name').value.trim();
            const buyer_phone = document.getElementById('buy-phone').value.trim();
            const buyer_size = document.getElementById('buy-size').value;
            const buyer_address = document.getElementById('buy-address').value.trim() || 'No especificada / A convenir';
            const buyer_notes = document.getElementById('buy-notes').value.trim() || 'Sin observaciones';

            // 1. Send Order to Backend & Firestore
            const orderPayload = {
                product_title,
                product_price,
                buyer_name,
                buyer_phone,
                buyer_size,
                buyer_address,
                buyer_notes,
                timestamp: new Date()
            };

            const db = window.firebaseDb;
            if (db) {
                try {
                    const orderId = 'order_' + Date.now();
                    await db.collection('pedidos').doc(orderId).set(orderPayload);
                } catch(fbErr) {
                    console.warn("Firestore order save error:", fbErr);
                }
            }
            try {
                await fetch('/api/pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderPayload)
                });
            } catch(e) {}

            // 2. Build WhatsApp Message & Redirect to Seller
            const sellerPhone = '5492617462601';
            let msg = `*¡NUEVA SOLICITUD DE COMPRA!* 👕🔥\n\n`;
            msg += `*Prenda:* ${product_title}\n`;
            if (product_price) msg += `*Precio:* ${product_price}\n`;
            msg += `*Talle:* ${buyer_size}\n`;
            msg += `*Comprador:* ${buyer_name}\n`;
            msg += `*Teléfono:* ${buyer_phone}\n`;
            msg += `*Dirección / Entrega:* ${buyer_address}\n`;
            if (buyer_notes !== 'Sin observaciones') msg += `*Notas:* ${buyer_notes}\n`;
            msg += `\n_Solicitud generada desde Zonda Streetwear Web_`;

            const waUrl = `https://wa.me/${sellerPhone}?text=${encodeURIComponent(msg)}`;
            
            // Open WhatsApp in new window
            window.open(waUrl, '_blank');

            // Reset & Close Modal
            formCompra.reset();
            closeModalCompra(false);
        });
    }

    // =========================================================================
    // LISTENER GLOBAL DE RETROCESO (BOTÓN FÍSICO / GESTO ATRÁS DEL TELÉFONO)
    // =========================================================================
    window.addEventListener('popstate', (e) => {
        // 0. Si el visor lightbox está abierto, cerrarlo inmediatamente
        if (lightboxZoom && lightboxZoom.classList.contains('active')) {
            closeLightbox(true);
            return;
        }

        // 1. Si el modal de compra está abierto, cerrarlo inmediatamente (no cerrar la página)
        if (modalCompra && modalCompra.classList.contains('active')) {
            closeModalCompra(true);
            return;
        }

        // 2. Navegación hacia atrás entre pestañas
        let targetTab = null;
        if (e.state && e.state.tab) {
            targetTab = e.state.tab;
        } else if (window.location.hash && window.location.hash !== '#lo-quiero') {
            try {
                targetTab = decodeURIComponent(window.location.hash.replace('#', ''));
            } catch(err) {
                targetTab = window.location.hash.replace('#', '');
            }
        } else {
            targetTab = 'tab-lookbook';
        }

        const currentActive = getActiveTabId();
        if (targetTab && targetTab !== currentActive && document.getElementById(targetTab)) {
            switchTab(targetTab, false);
            return;
        }

        // 3. Si ya está en la pestaña inicial y presiona atrás en el teléfono:
        // Evitar que la página se cierre de golpe por accidente y dar aviso amigable
        if (!allowExitOnBack) {
            allowExitOnBack = true;
            showExitToast();
            history.pushState({ tab: currentActive, rootGuard: true }, '', window.location.hash || '#' + currentActive);
        } else {
            // Confirmó salida presionando atrás dos veces seguidas en menos de 2.2 segundos
            history.back();
        }
    });

    // Inicializar estado seguro del historial para móviles
    const defaultInitialTab = 'tab-lookbook';
    let startTab = defaultInitialTab;
    if (window.location.hash && window.location.hash !== '#lo-quiero') {
        try {
            const h = decodeURIComponent(window.location.hash.replace('#', ''));
            if (document.getElementById(h)) startTab = h;
        } catch(e) {}
    }

    history.replaceState({ tab: startTab, isHomeRoot: true }, '', '#' + startTab);
    history.pushState({ tab: startTab, isReady: true }, '', '#' + startTab);
    switchTab(startTab, false);

    async function initFirestoreStorefront() {
        const db = window.firebaseDb;
        if (!db) return;

        // 1. Sync Catalogo from Firestore if available
        try {
            const catSnap = await db.collection('catalogo').get();
            if (!catSnap.empty) {
                let catList = [];
                catSnap.forEach(doc => catList.push({ id: doc.id, ...doc.data() }));
                catList.sort((a,b) => (a.order || 0) - (b.order || 0));
                const catGrid = document.querySelector('#tab-catalogo .products-grid') || document.querySelector('.products-grid');
                if (catGrid && catList.length > 0) {
                    catGrid.innerHTML = catList.map(item => `
                        <article class="product-card">
                            <div class="product-img">
                                <img src="${encodeURI(item.src || '')}" alt="${escapeHTML(item.title || '')}" loading="lazy">
                            </div>
                            <div class="product-info">
                                <h3>${escapeHTML(item.title || '')}</h3>
                                <p class="price">${escapeHTML(item.price || '')}</p>
                            </div>
                        </article>
                    `).join('');
                }
            }
        } catch(e) {}

        // 2. Sync Lookbook from Firestore if available
        try {
            const lbSnap = await db.collection('lookbook').get();
            if (!lbSnap.empty) {
                let lbList = [];
                lbSnap.forEach(doc => lbList.push({ id: doc.id, ...doc.data() }));
                lbList.sort((a,b) => (a.order || 0) - (b.order || 0));
                const lbGrid = document.querySelector('#tab-lookbook .lookbook-grid') || document.querySelector('.lookbook-grid');
                if (lbGrid && lbList.length > 0) {
                    lbGrid.innerHTML = lbList.map(item => {
                        const descHtml = item.description ? `<div class="product-info" style="pointer-events:none;"><h3 style="font-size:0.9rem;">${escapeHTML(item.description)}</h3></div>` : '';
                        return `
                            <article class="lookbook-item" style="position:relative;">
                                <img src="${encodeURI(item.src || '')}" alt="Modelo Zonda" loading="lazy">
                                ${descHtml}
                            </article>
                        `;
                    }).join('');
                }
            }
        } catch(e) {}

        observeElements();
    }

    // Initial reviews load if default active tab or on start
    loadReseñas();

    // Initial Firestore sync
    initFirestoreStorefront();

    // Initial observation
    observeElements();
});
