document.addEventListener('DOMContentLoaded', function () {
  // Referencias a los elementos de la UI
  const modal = document.getElementById('quoteModal');
  const openModalBtn = document.querySelector('.nav-item-active');
  const closeModalBtn = document.getElementById('closeModal');
  const steps = document.querySelectorAll('.step');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  let currentStep = 0;

  // Elementos de métodos de pago
  const creditCardFields = document.getElementById('creditCardFields');
  const paypalFields = document.getElementById('paypalFields');
  const payAtStoreFields = document.getElementById('payAtStoreFields');
  const invoiceFields = document.getElementById('invoiceFields');

  // Manejo de los campos de métodos de pago
  function showPaymentFields(paymentMethod) {
      // Ocultar todos los campos de métodos de pago
      creditCardFields.style.display = 'none';
      paypalFields.style.display = 'none';
      payAtStoreFields.style.display = 'none';
      invoiceFields.style.display = 'none';

      // Mostrar los campos según el método de pago seleccionado
      if (paymentMethod === 'credit_card') {
          creditCardFields.style.display = 'block';
      } else if (paymentMethod === 'paypal') {
          paypalFields.style.display = 'block';
      } else if (paymentMethod === 'store') {
          payAtStoreFields.style.display = 'block';
          generateStoreCode(); // Generar código para la tienda
      } else if (paymentMethod === 'invoice') {
          invoiceFields.style.display = 'block';
      }
  }

  // Generar código único de 5 dígitos para "Pay at Store"
  function generateStoreCode() {
      const storeCode = Math.floor(10000 + Math.random() * 90000);
      document.getElementById('storeCode').textContent = storeCode;
  }

  // Mostrar modal
  openModalBtn.addEventListener('click', () => {
      modal.style.display = 'block';
      loadSavedData();
      showStep(currentStep);
  });

  // Cerrar modal
  closeModalBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      saveData();
  });

  // Navegar entre los pasos
  nextBtn.addEventListener('click', () => {
      if (currentStep < steps.length - 1) {
          currentStep++;
          showStep(currentStep);

          // Si estamos en la página de "Order Review" (Step 4), mostrar los campos de pago
          if (currentStep === 3) {
              const selectedPaymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
              showPaymentFields(selectedPaymentMethod);
          }
      }
  });

  prevBtn.addEventListener('click', () => {
      if (currentStep > 0) {
          currentStep--;
          showStep(currentStep);
      }
  });

  // Mostrar el paso actual
  function showStep(step) {
      steps.forEach((s, i) => {
          s.classList.remove('active');
          if (i === step) s.classList.add('active');
      });

      prevBtn.style.display = step === 0 ? 'none' : 'inline-block';
      nextBtn.textContent = step === steps.length - 1 ? 'Finish' : 'Next';
  }

  // Guardar datos en localStorage
  function saveData() {
      const formData = {
          delivery: document.querySelector('input[name="delivery"]:checked')?.value,
          payment: document.querySelector('input[name="payment"]:checked')?.value,
          firstName: document.getElementById('firstName').value,
          lastName: document.getElementById('lastName').value,
          company: document.getElementById('company').value,
          email: document.getElementById('email').value,
          telephone: document.getElementById('telephone').value,
          address1: document.getElementById('address1').value,
          address2: document.getElementById('address2').value,
          city: document.getElementById('city').value,
          state: document.getElementById('state').value,
          country: document.getElementById('country').value,
          zipCode: document.getElementById('zipCode').value
      };

      localStorage.setItem('quoteData', JSON.stringify(formData));
  }

  // Cargar datos desde localStorage
  function loadSavedData() {
      const savedData = JSON.parse(localStorage.getItem('quoteData') || '{}');

      // Delivery option
      if (savedData.delivery) {
          document.querySelector(`input[name="delivery"][value="${savedData.delivery}"]`).checked = true;
      }

      // Payment method
      if (savedData.payment) {
          document.querySelector(`input[name="payment"][value="${savedData.payment}"]`).checked = true;
      }

      // Billing information
      document.getElementById('firstName').value = savedData.firstName || '';
      document.getElementById('lastName').value = savedData.lastName || '';
      document.getElementById('company').value = savedData.company || '';
      document.getElementById('email').value = savedData.email || '';
      document.getElementById('telephone').value = savedData.telephone || '';
      document.getElementById('address1').value = savedData.address1 || '';
      document.getElementById('address2').value = savedData.address2 || '';
      document.getElementById('city').value = savedData.city || '';
      document.getElementById('state').value = savedData.state || '';
      document.getElementById('country').value = savedData.country || '';
      document.getElementById('zipCode').value = savedData.zipCode || '';
  }
});
