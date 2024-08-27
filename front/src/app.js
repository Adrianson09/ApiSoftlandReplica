document.getElementById('replication-form').addEventListener('submit', async (e) => {
  e.preventDefault(); // Previene el envío del formulario por defecto

  const companySelect = document.getElementById('company');
  const providerSelect = document.getElementById('provider');

  const compania = companySelect.value;
  const proveedor = providerSelect.value;

  try {
    // Validamos si el proveedor existe en la compañía seleccionada
    const validarResponse = await fetch('http://192.168.25.225:3000/api/validarProveedor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ compania, proveedor }),
    });

    const validarData = await validarResponse.json();

    if (validarData.exists) {
      // Si el proveedor ya existe, mostramos el mensaje de error
      showMessage('Proveedor ya existe', 'bg-orange-600');
    } else {
      // Si no existe, replicamos el proveedor
      const replicarResponse = await fetch('http://192.168.25.225:3000/api/replicarProveedor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ compania, proveedor }),
      });

      if (replicarResponse.ok) {
        // Si la replicación es exitosa, mostramos el mensaje de éxito
        showMessage('Proveedor replicado correctamente', 'bg-green-600');
      } else {
        // Si ocurre algún error durante la replicación
        showMessage('Error al replicar el proveedor', 'bg-red-600');
      }
    }
  } catch (err) {
    console.error('Error durante la replicación:', err);
    showMessage('Error durante la replicación', 'bg-red-600');
  }
});

// Función para mostrar mensajes en pantalla
function showMessage(message, bgColor) {
  const messageContainer = document.getElementById('message-container');
  messageContainer.textContent = message;
  messageContainer.className = `fixed top-0 right-0 left-0 text-center p-4 ${bgColor} text-white`;
  messageContainer.classList.remove('hidden');

  // Elimina el mensaje después de 5 segundos
  setTimeout(() => {
    messageContainer.classList.add('hidden');
  }, 5000);
}

// Código para cargar compañías y proveedores al cargar la página
async function loadOptions() {
  try {
    // Cargar compañías
    const companyResponse = await fetch('http://192.168.25.225:3000/api/companias');
    const companies = await companyResponse.json();
    const companySelect = document.getElementById('company');
    companies.forEach((company) => {
      const option = document.createElement('option');
      option.value = company.conjunto;
      option.textContent = company.conjunto;
      companySelect.appendChild(option);
    });

    // Cargar proveedores
    const providerResponse = await fetch('http://192.168.25.225:3000/api/proveedores');
    const providers = await providerResponse.json();
    const providerSelect = document.getElementById('provider');
    providers.forEach((provider) => {
      const option = document.createElement('option');
      option.value = provider.proveedor;
      option.textContent = `${provider.proveedor} - ${provider.nombre} `;
      providerSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Error al cargar compañías o proveedores:', err);
  }
}

// Cargar las opciones de compañías y proveedores al cargar la página
window.addEventListener('DOMContentLoaded', loadOptions);
