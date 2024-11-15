<script setup>
import AutoComplete from 'primevue/autocomplete';
import { useToast } from 'primevue/usetoast';
import { ref, onBeforeMount, watch } from 'vue';
import { FilterMatchMode } from '@primevue/core/api';
import apiClient from '@/axios';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Calendar from 'primevue/calendar';
import { useStore } from 'vuex';
// Lifecycle hooks
onBeforeMount(() => {
    fetchInvoices();
});

// Dialog and Visibility
const invoiceDialog = ref(false);
const itemDialogVisible = ref(false);
const deleteInvoicesDialog = ref(false);
// Notification and TOken
const toast = useToast();
const store = useStore();
const token = store.state.authToken;
const loading = ref(true);

// Invoices Data
const invoices = ref([]);
const expandedRows = ref([]);
const invoice = ref({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    client_id: null,
    client_display: '',
    client_address: '',
    items: []
});
const currentItem = ref({
    item_id: null,
    item_name: '',
    quantity: 1,
    unit_price: 0
});

// Load Invoice
onBeforeMount(() => {
    fetchInvoices();
});
// Open adn Close Dialog
function closeItemDialog() {
    itemDialogVisible.value = false;
}
function openNew() {
    invoice.value = {
        id: null,
        invoice_number: '',
        invoice_date: null,
        client_id: null,
        client_display: '',
        items: []
    };
    selectedAutoValue.value = null;
    invoiceDialog.value = true;
}
function openItemDialog(item = null) {
    currentItem.value = item ? { ...item } : { item_id: null, item_name: '', quantity: 1, unit_price: 0 };
    itemDialogVisible.value = true;
}
function editItem(item) {
    if (item) {
        currentItem.value = { ...item };
        itemDialogVisible.value = true;
    } else {
        console.error('No item provided for editing.');
    }
}

function saveItem() {
    if (currentItem.value.item_id) {
        const index = invoice.value.items.findIndex((item) => item.item_id === currentItem.value.item_id);
        if (index !== -1) invoice.value.items[index] = { ...currentItem.value };
    } else {
        currentItem.value.item_id = invoice.value.items.length + 1;
        invoice.value.items.push({ ...currentItem.value });
    }
    itemDialogVisible.value = false;
}

function removeItem(itemId) {
    invoice.value.items = invoice.value.items.filter((item) => item.item_id !== itemId);
}

function hideDialog() {
    invoiceDialog.value = false;
    itemDialogVisible.value = false;
}

function confirmDeleteInvoice(prod) {
    invoice.value = prod;
    deleteInvoicesDialog.value = true;
}
async function editInvoice(existingInvoice) {
    invoice.value = { ...existingInvoice };

    if (invoice.value.id) {
        // Pre-fetch clients to populate autoFilteredValue
        await searchClient({ query: '' }); // Fetch all clients or filtered clients if needed

        // Find the client based on `client_id` in `invoice`
        const matchingClient = autoFilteredValue.value.find((client) => client.id === invoice.value.client_id);

        // Set `selectedAutoValue` with the matching client if found
        if (matchingClient) {
            selectedAutoValue.value = matchingClient;
        } else {
            console.warn('Client not found in autoFilteredValue');
        }
    }

    invoiceDialog.value = true;
}

// Format

function formatCurrency(value) {
    const number = parseFloat(value);
    if (isNaN(number)) return '$0.00';
    return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
function formatDate(date) {
    const parsedDate = new Date(date);
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[parsedDate.getMonth()]; // Get the month name
    const year = parsedDate.getFullYear();

    return `${day}-${month}-${year}`; // Format as dd-MMM-yyyy
}
function formatForMySQL(dateString) {
    if (dateString instanceof Date) {
        const day = String(dateString.getDate()).padStart(2, '0');
        const month = String(dateString.getMonth() + 1).padStart(2, '0');
        const year = dateString.getFullYear();
        return `${year}-${month}-${day} 00:00:00`;
    }

    if (typeof dateString === 'string') {
        const match = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (!match) {
            throw new Error('Invalid date format. Expected format: dd-mm-yyyy');
        }

        const [_, day, month, year] = match;
        return `${year}-${month}-${day} 00:00:00`;
    }

    throw new Error('Invalid date input. Must be a string in dd-mm-yyyy format or a Date object.');
}

// AutoComplete For Invoices
const autoFilteredValue = ref([]);
const selectedAutoValue = ref(null);

watch(selectedAutoValue, (newVal) => {
    if (newVal) {
        invoice.value.client_id = newVal.id;
        invoice.value.client_display = newVal.client_display;
    } else {
        invoice.value.client_id = null;
        invoice.value.client_display = '';
    }
});

async function searchClient() {
    try {
        const response = await apiClient.get('/clients/select', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        autoFilteredValue.value = response.data.map((client) => ({
            id: client.id,
            client_display: client.client_display
        }));

        console.log('Preloaded clients:', autoFilteredValue.value);
    } catch (error) {
        console.error('Error preloading clients:', error);
    }
}

//Pagination
const rows = ref(10);
const first = ref(0);
const onRowsChange = (value) => {
    rows.value = value;
};
const onPageChange = (value) => {
    first.value = value;
};
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

// CRUD Invoices
function validateInvoice() {
    // Check if there are items
    if (!invoice.value.items || invoice.value.items.length === 0) {
        toast.add({
            severity: 'warn',
            summary: 'Validation Error',
            detail: 'Invoice items cannot be empty.',
            life: 3000
        });
        return false;
    }

    // Check if any item's price is 0
    for (const item of invoice.value.items) {
        if (item.unit_price === 0) {
            toast.add({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Item price cannot be 0.',
                life: 3000
            });
            return false;
        }
    }

    return true;
}
async function saveInvoice() {
    // Run the validation before proceeding
    if (!validateInvoice()) {
        return;
    }

    try {
        const token = store.state.authToken;
        const formattedDate = formatForMySQL(invoice.value.invoice_date);

        const payload = {
            invoice_date: formattedDate,
            client_id: invoice.value.client_id,
            items: invoice.value.items
        };

        if (invoice.value.id) {
            // Update existing invoice
            await apiClient.put(`/invoices/${invoice.value.id}`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            toast.add({ severity: 'success', summary: 'Success', detail: 'Invoice updated successfully.', life: 3000 });

            fetchInvoices();
        } else {
            // Create a new invoice
            await apiClient.post('/invoices', payload, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            toast.add({ severity: 'success', summary: 'Success', detail: 'Invoice created successfully.', life: 3000 });
            fetchInvoices();
        }

        invoiceDialog.value = false;
    } catch (error) {
        console.error('Error saving invoice:', error);

        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.response?.data?.message || 'Failed to save invoice.',
            life: 3000
        });
    }
}

const fetchInvoices = async () => {
    loading.value = true;
    try {
        const response = await apiClient.get('/invoices', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        invoices.value = response.data.map((invoice) => ({
            ...invoice,
            invoice_date: new Date(invoice.invoice_date),
            items: invoice.items.map((item) => ({
                ...item,
                unit_price: parseFloat(item.unit_price),
                total_price: parseFloat(item.unit_price) * item.quantity
            }))
        }));
    } catch (error) {
        console.error('Error fetching invoices:', error);
    } finally {
        loading.value = false;
    }
};
async function printInvoice(id) {
    loading.value = true;
    try {
        const response = await apiClient.get(`/invoices/${id}/pdf`, {
            responseType: 'blob',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoice_${id}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`Invoice ${id} downloaded successfully.`);
    } catch (error) {
        console.error(`Error printing invoice ${id}:`, error);
    } finally {
        loading.value = false;
    }
}

async function deleteInvoice() {
    try {
        await apiClient.delete(`/invoices/${invoice.value.id}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        invoices.value = invoices.value.filter((val) => val.id !== invoice.value.id);

        deleteInvoicesDialog.value = false;
        invoice.value = {};
        toast.add({
            severity: 'success',
            summary: 'Successful',
            detail: 'Invoice Deleted',
            life: 3000
        });

        await fetchInvoices();
    } catch (error) {
        console.error('Error deleting invoice:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete invoice',
            life: 3000
        });
    }
}
</script>

<template>
    <div>
        <div class="card">
            <div class="font-semibold text-xl mb-4">Invoice List</div>
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="New" icon="pi pi-plus" severity="secondary" class="mr-3" @click="openNew" />
                </template>
                <template #end>
                    <IconField>
                        <InputIcon>
                            <i class="pi pi-search" />
                        </InputIcon>
                        <InputText v-model="filters['global'].value" placeholder="Search (Invoice Number)" />
                    </IconField>
                </template>
            </Toolbar>

            <DataTable
                :value="invoices"
                :filters="filters"
                :expandedRows="expandedRows"
                dataKey="id"
                tableStyle="min-width: 60rem"
                :loading="loading"
                paginator
                :rows="rows"
                :rowsPerPageOptions="[10, 20, 50]"
                :first="first"
                @update:rows="onRowsChange"
                @update:first="onPageChange"
            >
                <Column expander style="width: 7rem" />
                <Column field="invoice_number" header="Invoice Number"></Column>
                <Column header="Client Number - Name">
                    <template #body="slotProps">
                        {{ slotProps.data.client.client_display }}
                    </template>
                </Column>
                <Column header="Client Address">
                    <template #body="slotProps">
                        {{ slotProps.data.client.client_address }}
                    </template>
                </Column>
                <Column field="invoice_date" header="Invoice Date">
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.invoice_date) }}
                    </template>
                </Column>
                <Column field="grand_total" header="Grand Total">
                    <template #body="slotProps">
                        {{ formatCurrency(slotProps.data.grand_total) }}
                    </template>
                </Column>
                <Column headerStyle="width:10rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editInvoice(slotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteInvoice(slotProps.data)" />
                    </template>
                </Column>
                <Column headerStyle="width:4rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-print" @click="printInvoice(slotProps.data.id)" />
                    </template>
                </Column>

                <template #expansion="slotProps">
                    <div class="p-4">
                        <h5>Items for Invoice #{{ slotProps.data.invoice_number }}</h5>
                        <DataTable :value="slotProps.data.items">
                            <Column field="item_name" header="Item Name"></Column>
                            <Column field="quantity" header="Quantity"></Column>
                            <Column field="unit_price" header="Unit Price">
                                <template #body="slotProps">
                                    {{ formatCurrency(slotProps.data.unit_price) }}
                                </template>
                            </Column>
                            <Column field="total_price" header="Total Price">
                                <template #body="slotProps">
                                    {{ formatCurrency(slotProps.data.total_price) }}
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </template>
            </DataTable>
        </div>

        <!-- Dialog for Adding New Invoice -->
        <Dialog v-model:visible="invoiceDialog" :style="{ width: '600px' }" header="New Invoice" :modal="true">
            <div class="flex flex-col gap-6">
                <!-- Invoice Number and Invoice Date -->
                <div class="flex flex-row gap-4">
                    <!-- Invoice Number -->
                    <div class="flex-1">
                        <label for="invoiceNumber" class="block font-bold mb-2">Invoice Number</label>
                        <InputText id="invoiceNumber" v-model="invoice.invoice_number" placeholder="Invoice Number (Read-Only)" disabled />
                    </div>
                    <!-- Invoice Date -->
                    <div class="flex-1">
                        <label for="invoiceDate" class="block font-bold mb-2">Invoice Date</label>
                        <Calendar id="invoiceDate" v-model="invoice.invoice_date" dateFormat="dd-mm-yy" showIcon />
                    </div>
                </div>

                <!-- Client Number and Client Address -->
                <div class="flex-1">
                    <label for="clientDisplay" class="block font-bold mb-2">Client</label>
                    <AutoComplete v-model="selectedAutoValue" :suggestions="autoFilteredValue" optionLabel="client_display" placeholder="Search" dropdown :disabled="!!invoice.id" @complete="searchClient" />
                </div>

                <!-- Invoice Items -->
                <div>
                    <h3 class="font-bold mb-2">Items</h3>
                    <div class="mb-4">
                        <Button label="Add Item" icon="pi pi-plus" @click="openItemDialog()" />
                    </div>
                    <DataTable :value="invoice.items" dataKey="item_id" tableStyle="min-width: 30rem">
                        <Column field="item_name" header="Item Name"></Column>
                        <Column field="quantity" header="Quantity"></Column>
                        <Column field="unit_price" header="Unit Price">
                            <template #body="slotProps">
                                {{ formatCurrency(slotProps.data.unit_price) }}
                            </template>
                        </Column>
                        <Column field="total_price" header="Total Price">
                            <template #body="slotProps">
                                {{ formatCurrency(slotProps.data.quantity * slotProps.data.unit_price) }}
                            </template>
                        </Column>
                        <Column headerStyle="width: 5rem">
                            <template #body="slotProps">
                                <div class="flex items-center space-x-2">
                                    <Button icon="pi pi-pencil" @click="editItem(slotProps.data)" />
                                    <Button icon="pi pi-trash" class="p-button-danger" @click="removeItem(slotProps.data.item_id)" />
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Save" icon="pi pi-check" @click="saveInvoice" />
            </template>
        </Dialog>

        <!-- Item Dialog -->
        <Dialog v-model:visible="itemDialogVisible" :style="{ width: '400px' }" header="Item Details" :modal="true">
            <div class="flex flex-col gap-4">
                <!-- Item Name -->
                <div>
                    <label for="itemName" class="block font-bold mb-2">Item Name</label>
                    <InputText id="itemName" v-model="currentItem.item_name" placeholder="Enter item name" />
                </div>

                <!-- Quantity -->
                <div>
                    <label for="quantity" class="block font-bold mb-2">Quantity</label>
                    <InputNumber id="quantity" v-model="currentItem.quantity" :min="1" placeholder="Enter quantity" />
                </div>

                <!-- Unit Price -->
                <div>
                    <label for="unitPrice" class="block font-bold mb-2">Unit Price</label>
                    <InputNumber id="unitPrice" v-model="currentItem.unit_price" mode="currency" currency="USD" locale="en-US" placeholder="Enter unit price" />
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="closeItemDialog" />
                <Button label="Save" icon="pi pi-check" @click="saveItem" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteInvoicesDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span
                    >Are you sure you want to delete this invoice <b>{{ invoice.invoice_number }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteInvoicesDialog = false" />
                <Button label="Yes" icon="pi pi-check" @click="deleteInvoice" />
            </template>
        </Dialog>
    </div>
</template>
<style scoped>
.card {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #fff;
}
</style>
