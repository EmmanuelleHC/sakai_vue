<!-- eslint-disable no-unused-vars -->
<script setup>
import { useToast } from 'primevue/usetoast';
import { ref, onBeforeMount } from 'vue';
import apiClient from '@/axios';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Calendar from 'primevue/calendar';
const productDialog = ref(false);
const invoices = ref([]);
const expandedRows = ref([]);
const loading = ref(true);
const submitted = ref(false);
const itemDialogVisible = ref(false);
const selectedProducts = ref([]);
const deleteProductDialog = ref(false);
const toast = useToast();
const products = ref([]);
function closeItemDialog() {
    itemDialogVisible.value = false; // Close the item dialog
}
const product = ref({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    client_number: '',
    client_address: '',
    items: []
});

const currentItem = ref({ item_id: null, item_name: '', quantity: 1, unit_price: 0 });

onBeforeMount(() => {
    fetchInvoices();
});

function openNew() {
    product.value = {
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        client_number: '',
        client_address: '',
        items: []
    };
    submitted.value = false;
    productDialog.value = true;
}
function formatForMySQL(isoString) {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function saveInvoice() {
    // Validation for required fields
    if (!product.value.invoice_number || !product.value.client_number || !product.value.client_address) {
        toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Required fields are missing.', life: 3000 });
        return;
    }

    // Validation to ensure items are not empty
    if (!product.value.items || product.value.items.length === 0) {
        toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Invoice items cannot be empty.', life: 3000 });
        return;
    }

    loading.value = true;

    try {
        const formattedDate = formatForMySQL(product.value.invoice_date);
        const payload = {
            invoice_number: product.value.invoice_number,
            invoice_date: formattedDate,
            client_number: product.value.client_number,
            client_address: product.value.client_address,
            items: product.value.items
        };

        if (product.value.id) {
            // update existing invoice
            const response = await apiClient.put(`/invoices/${product.value.id}`, payload);
            toast.add({ severity: 'success', summary: 'Success', detail: 'Invoice updated successfully.', life: 3000 });

            const index = invoices.value.findIndex((inv) => inv.id === product.value.id);
            if (index !== -1) invoices.value[index] = response.data;
        } else {
            // insert new invoice

            const response = await apiClient.post('/invoices', payload);
            toast.add({ severity: 'success', summary: 'Success', detail: 'Invoice created successfully.', life: 3000 });

            invoices.value.push(response.data);
        }

        productDialog.value = false;
    } catch (error) {
        console.error('Error saving invoice:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save invoice.', life: 3000 });
    } finally {
        loading.value = false;
    }
}

function fetchInvoices() {
    loading.value = true;
    apiClient
        .get('/invoices')
        .then((response) => {
            invoices.value = response.data.map((invoice) => ({
                ...invoice,
                invoice_date: new Date(invoice.invoice_date),
                items: invoice.items.map((item) => ({
                    ...item,
                    unit_price: parseFloat(item.unit_price),
                    total_price: parseFloat(item.unit_price) * item.quantity
                }))
            }));
        })
        .catch((error) => console.error('Error fetching invoices:', error))
        .finally(() => (loading.value = false));
}
function printInvoice(id) {
    apiClient
        .get(`/invoices/${id}/pdf`, { responseType: 'blob' })
        .then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice_${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .catch((error) => console.error(`Error printing invoice ${id}:`, error));
}

function openItemDialog(item = null) {
    currentItem.value = item ? { ...item } : { item_id: null, item_name: '', quantity: 1, unit_price: 0 };
    itemDialogVisible.value = true;
}

function saveItem() {
    if (currentItem.value.item_id) {
        const index = product.value.items.findIndex((item) => item.item_id === currentItem.value.item_id);
        if (index !== -1) product.value.items[index] = { ...currentItem.value };
    } else {
        currentItem.value.item_id = product.value.items.length + 1;
        product.value.items.push({ ...currentItem.value });
    }
    itemDialogVisible.value = false;
}

function removeItem(itemId) {
    product.value.items = product.value.items.filter((item) => item.item_id !== itemId);
}

function hideDialog() {
    productDialog.value = false;
    itemDialogVisible.value = false;
}

async function deleteProduct() {
    try {
        await apiClient.delete(`/invoices/${product.value.id}`);

        products.value = products.value.filter((val) => val.id !== product.value.id);

        deleteProductDialog.value = false;
        product.value = {};
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Product Deleted', life: 3000 });
        await fetchInvoices();
    } catch (error) {
        console.error('Error deleting product:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete product', life: 3000 });
    }
}

function confirmDeleteProduct(prod) {
    product.value = prod;
    deleteProductDialog.value = true;
}
function editProduct(prod) {
    product.value = { ...prod };
    productDialog.value = true;
}
function formatCurrency(value) {
    const number = parseFloat(value);
    if (isNaN(number)) return '$0.00';
    return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}
</script>

<template>
    <div>
        <div class="card">
            <div class="font-semibold text-xl mb-4">Invoice List</div>
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="New" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                </template>
            </Toolbar>
            <DataTable :value="invoices" :expandedRows="expandedRows" dataKey="id" tableStyle="min-width: 60rem" :loading="loading">
                <Column expander style="width: 5rem" />
                <Column field="invoice_number" header="Invoice Number"></Column>
                <Column field="client_number" header="Client Number"></Column>
                <Column field="client_address" header="Client Address"></Column>
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
                        <Button icon="pi pi-pencil" outlined rounded class="mr-2" @click="editProduct(slotProps.data)" />
                        <Button icon="pi pi-trash" outlined rounded severity="danger" @click="confirmDeleteProduct(slotProps.data)" />
                    </template>
                </Column>
                <Column headerStyle="width:4rem">
                    <template #body="slotProps">
                        <Button icon="pi pi-print" @click="printInvoice(slotProps.data.id)" />
                    </template>
                </Column>

                <!-- Row Expansion Template for Invoice Items -->
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
        <Dialog v-model:visible="productDialog" :style="{ width: '600px' }" header="New Invoice" :modal="true">
            <div class="flex flex-col gap-6">
                <!-- Invoice Number -->
                <div>
                    <label for="invoiceNumber" class="block font-bold mb-2">Invoice Number</label>
                    <InputText id="invoiceNumber" v-model="product.invoice_number" placeholder="Enter invoice number" />
                </div>

                <!-- Invoice Date -->
                <div>
                    <label for="invoiceDate" class="block font-bold mb-2">Invoice Date</label>
                    <Calendar id="invoiceDate" v-model="product.invoice_date" dateFormat="yy-mm-dd" showIcon />
                </div>

                <!-- Client Number -->
                <div>
                    <label for="clientNumber" class="block font-bold mb-2">Client Number</label>
                    <InputText id="clientNumber" v-model="product.client_number" placeholder="Enter client number" />
                </div>

                <!-- Client Address -->
                <div>
                    <label for="clientAddress" class="block font-bold mb-2">Client Address</label>
                    <InputText id="clientAddress" v-model="product.client_address" rows="2" placeholder="Enter client address" />
                </div>

                <!-- Invoice Items -->
                <div>
                    <h3 class="font-bold mb-2">Items</h3>
                    <div class="mb-4">
                        <Button label="Add Item" icon="pi pi-plus" @click="openItemDialog()" />
                    </div>
                    <DataTable :value="product.items" dataKey="item_id" tableStyle="min-width: 30rem">
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
                        <Column headerStyle="width: 3rem">
                            <template #body="slotProps">
                                <Button icon="pi pi-pencil" @click="editItem(slotProps.data)" />
                                <Button icon="pi pi-trash" class="p-button-danger ml-2" @click="removeItem(slotProps.data.item_id)" />
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

        <Dialog v-model:visible="deleteProductDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
            <div class="flex items-center gap-4">
                <i class="pi pi-exclamation-triangle !text-3xl" />
                <span v-if="product"
                    >Are you sure you want to delete <b>{{ product.name }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteProductDialog = false" />
                <Button label="Yes" icon="pi pi-check" @click="deleteProduct" />
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
