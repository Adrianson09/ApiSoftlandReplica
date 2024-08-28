// Función para mostrar mensajes en pantalla
function showMessage(message, bgColor, containerId) {
  const messageContainer = document.getElementById(containerId);
  messageContainer.textContent = message;
  messageContainer.className = `fixed top-0 right-0 left-0 text-center p-4 ${bgColor} text-white`;
  messageContainer.classList.remove('hidden');

  setTimeout(() => {
    messageContainer.classList.add('hidden');
  }, 3000);
}

// Manejo del formulario de proveedores
document.getElementById('replicate-provider-form').addEventListener('submit', async (e) => {
  e.preventDefault(); // Previene el envío del formulario por defecto

  const companySelect = document.getElementById('company');
  const providerSelect = document.getElementById('provider');

  const compania = companySelect.value;
  const proveedor = providerSelect.value;

  try {
    // Validamos si el proveedor existe en la compañía seleccionada
    const validarProveedorResponse = await fetch('http://192.168.25.225:3000/api/validarProveedor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ compania, proveedor }),
    });

    const validarProveedorData = await validarProveedorResponse.json();

    if (validarProveedorData.exists) {
      // Si el proveedor ya existe, mostramos el mensaje de error
      showMessage('Proveedor ya existe', 'bg-orange-600', 'message-container-provider');
    } else {
      // Si no existe, replicamos el proveedor
      const replicarProveedorResponse = await fetch('http://192.168.25.225:3000/api/replicarProveedor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ compania, proveedor }),
      });

      if (replicarProveedorResponse.ok) {
        // Si la replicación es exitosa, mostramos el mensaje de éxito
        showMessage('Proveedor replicado correctamente', 'bg-green-600', 'message-container-provider');
      } else {
        // Si ocurre algún error durante la replicación
        showMessage('Error al replicar el proveedor', 'bg-red-600', 'message-container-provider');
      }
    }
  } catch (err) {
    console.error('Error durante la replicación:', err);
    showMessage('Error durante la replicación', 'bg-red-600', 'message-container-provider');
  }
});

// Manejo del formulario de clientes
document.getElementById('replicate-client-form').addEventListener('submit', async (e) => {
  e.preventDefault(); // Previene el envío del formulario por defecto

  const companySelect = document.getElementById('company-client');
  const clientSelect = document.getElementById('client');

  const compania = companySelect.value;  // Cambio el nombre de la variable a 'compania'
  const cliente = clientSelect.value;

  // Validación previa para evitar valores undefined
  if (!compania || compania === 'undefined') {
    showMessage('Por favor, selecciona una compañía válida', 'bg-red-600', 'message-container-client');
    return;
  }

  if (!cliente || cliente === 'undefined') {
    showMessage('Por favor, selecciona un cliente válido', 'bg-red-600', 'message-container-client');
    return;
  }

  try {
    // Validamos si el cliente existe en la compañía seleccionada
    const validarClienteResponse = await fetch('http://192.168.25.225:3000/api/validarCliente', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ compania, cliente }),  // Aquí asegúrate de que el servidor reciba los campos correctamente
    });

    if (!validarClienteResponse.ok) {
      throw new Error(`Error al validar el cliente: ${validarClienteResponse.statusText}`);
    }

    const validarClienteData = await validarClienteResponse.json();

    if (validarClienteData.exists) {
      // Si el cliente ya existe, mostramos el mensaje de error y no replicamos
      showMessage('Cliente ya existe', 'bg-orange-600', 'message-container-client');
    } else {
      // Si no existe, replicamos el cliente
      const replicarClienteResponse = await fetch('http://192.168.25.225:3000/api/replicarCliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ compania, cliente }),  // Corregido el envío de datos
      });

      if (!replicarClienteResponse.ok) {
        throw new Error(`Error al replicar el cliente: ${replicarClienteResponse.statusText}`);
      }

      // Si la replicación es exitosa, mostramos el mensaje de éxito
      showMessage('Cliente replicado correctamente', 'bg-green-600', 'message-container-client');
    }
  } catch (err) {
    console.error('Error durante la replicación:', err);
    showMessage(`Error durante la replicación: ${err.message}`, 'bg-red-600', 'message-container-client');
  }
});


// Código para cargar compañías, proveedores y clientes al cargar la página
async function loadOptions() {
  try {
    // Cargar compañías
    const companyResponse = await fetch('http://192.168.25.225:3000/api/companias');
    const companies = await companyResponse.json();
    
    // Cargar opciones para proveedores
    const companySelect = document.getElementById('company');
    companies.forEach((company) => {
      const option = document.createElement('option');
      option.value = company.conjunto;
      option.textContent = company.conjunto;
      companySelect.appendChild(option);
    });

    // Cargar opciones para clientes
    const companyClientSelect = document.getElementById('company-client');
    companies.forEach((company) => {
      const option = document.createElement('option');
      option.value = company.conjunto;
      option.textContent = company.conjunto;
      companyClientSelect.appendChild(option);
    });

    // Cargar proveedores
    const providerResponse = await fetch('http://192.168.25.225:3000/api/proveedores');
    const providers = await providerResponse.json();
    const providerSelect = document.getElementById('provider');
    providers.forEach((provider) => {
      const option = document.createElement('option');
      option.value = provider.proveedor;
      option.textContent = `${provider.proveedor} - ${provider.nombre}`;
      providerSelect.appendChild(option);
    });

    // Cargar clientes
    const clientResponse = await fetch('http://192.168.25.225:3000/api/clientes');
    const clients = await clientResponse.json();
    const clientSelect = document.getElementById('client');
    clients.forEach((client) => {
      const option = document.createElement('option');
      option.value = client.cliente;
      option.textContent = `${client.cliente} - ${client.nombre}`;
      clientSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Error al cargar compañías, proveedores o clientes:', err);
  }
}

// Llamar a la función de carga de opciones al cargar la página
window.addEventListener('DOMContentLoaded', loadOptions);

// Manejo del botón de eliminación
document.addEventListener('DOMContentLoaded', () => {
  const deleteButton = document.getElementById('delete-button');

  deleteButton.addEventListener('click', async () => {
    if (!confirm('¿Estás seguro de que quieres limpiar todos los usuarios conectados?')) {
      return;
    }

    try {
      const response = await fetch('http://192.168.25.225:3000/api/eliminar-registros', {
        method: 'DELETE',
      });

      if (response.ok) {
        showMessage('Todos los usuarios ya pueden conectarse.', 'bg-green-600', 'message-container-provider');
      } else {
        showMessage('Error al eliminar los registros.', 'bg-red-600', 'message-container-provider');
      }
    } catch (err) {
      console.error('Error al eliminar los registros:', err);
      showMessage('Error al eliminar los registros.', 'bg-red-600', 'message-container-provider');
    }
  });
});
