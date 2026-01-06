(function () {
  window.AppParts = window.AppParts || {};

  window.AppParts.galleryUpload = function galleryUpload(ctx) {
    (function fillCatIdHiddenInputs() {
      const catId = ctx.getCatIdFromUrl();
      if (!catId) return;
      const input1 = document.getElementById('cat_id');
      if (input1) input1.value = catId;
      const input2 = document.getElementById('cat_id_gallery');
      if (input2) input2.value = catId;
    })();

    (function initGalleryUpload() {
      const form = document.getElementById('cat_gallery_upload_form');
      const fileInput = document.getElementById('cat_photo');
      if (!form || !fileInput) return;

      document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-gallery-upload]');
        if (!trigger) return;
        e.preventDefault();
        fileInput.click();
      });

      fileInput.addEventListener('change', () => {
        if (!fileInput.files || fileInput.files.length === 0) return;
        form.requestSubmit();
      });
    })();
  };
})();
