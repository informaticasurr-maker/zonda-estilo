document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Tab Switching Logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            if(targetContent) {
                targetContent.classList.add('active');
                if (targetId === 'tab-noticias') {
                    await refreshNoticias();
                } else if (targetId === 'tab-reseñas') {
                    await loadReseñas();
                }
                // Re-trigger animations when switching tabs
                observeElements();
            }
        });
    });

    async function refreshNoticias() {
        try {
            const res = await fetch('/api/noticias?_t=' + Date.now());
            const data = await res.json();
            const grid = document.querySelector('#tab-noticias .news-grid');
            if (!grid) return;

            if (!data || data.length === 0) {
                grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1;">No hay noticias o promociones activas por el momento.</p>';
                return;
            }

            grid.innerHTML = data.map(item => {
                let mediaHtml = '';
                if (item.media) {
                    if (item.media_type && item.media_type.includes('video')) {
                        mediaHtml = `<div class="news-media"><video src="${item.media}" autoplay loop muted playsinline style="width:100%; height:320px; object-fit:cover; border-radius:12px 12px 0 0; display:block;"></video></div>`;
                    } else {
                        mediaHtml = `<div class="news-media"><img src="${item.media}" alt="Noticia Zonda" loading="lazy" style="width:100%; height:320px; object-fit:cover; border-radius:12px 12px 0 0; display:block;"></div>`;
                    }
                }
                let textHtml = item.text ? `<div class="news-body" style="padding: 22px;"><p style="font-size: 0.95rem; color: var(--text-primary); line-height: 1.6; margin:0;">${item.text}</p></div>` : '';
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

    // Load Reseñas function
    async function loadReseñas() {
        try {
            const res = await fetch('/api/reseñas?_t=' + Date.now());
            const data = await res.json();
            const grid = document.getElementById('reviews-grid');
            if (!grid) return;

            if (!data || data.length === 0) {
                grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center;">Aún no hay reseñas publicadas. ¡Sé el primero en opinar!</p>';
                return;
            }

            grid.innerHTML = data.map(item => {
                const stars = '★'.repeat(item.rating || 5) + '☆'.repeat(5 - (item.rating || 5));
                return `
                    <article class="review-card">
                        <div class="review-author-info">
                            <span class="review-author-name">${item.name || 'Anónimo'}</span>
                            <span class="review-date">${item.date || 'Reciente'}</span>
                        </div>
                        <div class="stars-gold">${stars}</div>
                        <p class="review-comment">"${item.comment}"</p>
                    </article>
                `;
            }).join('');
        } catch(e) {}
    }

    // Submit Reseña Form
    const formReseña = document.getElementById('form-reseña');
    if (formReseña) {
        formReseña.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('rev-name').value;
            const rating = parseInt(document.getElementById('rev-rating').value, 10);
            const comment = document.getElementById('rev-comment').value;

            try {
                const res = await fetch('/api/reseñas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, rating, comment })
                });
                if (res.ok) {
                    formReseña.reset();
                    await loadReseñas();
                    alert('¡Gracias por tu reseña! Ha sido publicada correctamente.');
                }
            } catch(e) {
                alert('Error al publicar la reseña. Inténtalo nuevamente.');
            }
        });
    }

    // Modal de Compra ("LO QUIERO..!!")
    const modalCompra = document.getElementById('modal-compra');
    const closeModalBtn = document.getElementById('close-modal-compra');
    const formCompra = document.getElementById('form-compra');

    function openModalCompra(title, price, imgSrc) {
        if (!modalCompra) return;
        document.getElementById('modal-product-title').textContent = title || 'Prenda Zonda';
        document.getElementById('modal-product-price').textContent = price || 'Consultar Precio';
        document.getElementById('modal-product-img').src = imgSrc || '';
        document.getElementById('buy-product-title').value = title || 'Prenda Zonda';
        document.getElementById('buy-product-price').value = price || '';
        
        modalCompra.classList.add('active');
    }

    function closeModalCompra() {
        if (modalCompra) modalCompra.classList.remove('active');
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModalCompra);
    }

    if (modalCompra) {
        modalCompra.addEventListener('click', (e) => {
            if (e.target === modalCompra) closeModalCompra();
        });
    }

    // Event Delegation for clicking any product-card or lookbook-item
    document.addEventListener('click', (e) => {
        const productCard = e.target.closest('.product-card');
        const lookbookItem = e.target.closest('.lookbook-item');

        if (productCard) {
            const title = productCard.querySelector('h3') ? productCard.querySelector('h3').textContent.trim() : 'Prenda Zonda';
            const price = productCard.querySelector('.price') ? productCard.querySelector('.price').textContent.trim() : 'Consultar';
            const img = productCard.querySelector('img') ? productCard.querySelector('img').src : '';
            openModalCompra(title, price, img);
        } else if (lookbookItem) {
            const title = lookbookItem.querySelector('h3') ? lookbookItem.querySelector('h3').textContent.trim() : 'Remera Zonda (Lookbook)';
            const price = 'Precio a consultar';
            const img = lookbookItem.querySelector('img') ? lookbookItem.querySelector('img').src : '';
            openModalCompra(title, price, img);
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

            // 1. Send Order to Backend
            try {
                await fetch('/api/pedidos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        product_title,
                        product_price,
                        buyer_name,
                        buyer_phone,
                        buyer_size,
                        buyer_address,
                        buyer_notes
                    })
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
            closeModalCompra();
        });
    }

    // Initial reviews load if default active tab or on start
    loadReseñas();

    // Initial observation
    observeElements();
});
