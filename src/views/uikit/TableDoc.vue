<template>
    <div>
        <div class="card">
            <div class="font-semibold text-xl mb-4">Invoice List</div>
            <Toolbar class="mb-6">
                <template #start>
                    <Button label="New" icon="pi pi-plus" severity="secondary" class="mr-2" @click="openNew" />
                    <Button label="Delete" icon="pi pi-trash" severity="secondary" @click="confirmDeleteSelected" :disabled="!selectedProducts || !selectedProducts.length" />
                </template>

            </Toolbar>
            <DataTable :value="invoices" :expandedRows="expandedRows" dataKey="id" tableStyle="min-width: 60rem" :loading="loading">
        
                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
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
        <Dialog v-model:visible="productDialog" :style="{ width: '450px' }" header="Product Details" :modal="true">
                <div class="flex flex-col gap-6">
                    <img v-if="product.image" :src="`https://primefaces.org/cdn/primevue/images/product/${product.image}`" :alt="product.image" class="block m-auto pb-4" />
                    <div>
                        <label for="name" class="block font-bold mb-3">Name</label>
                        <InputText id="name" v-model.trim="product.name" required="true" autofocus :invalid="submitted && !product.name" fluid />
                        <small v-if="submitted && !product.name" class="text-red-500">Name is required.</small>
                    </div>
                    <div>
                        <label for="description" class="block font-bold mb-3">Description</label>
                        <Textarea id="description" v-model="product.description" required="true" rows="3" cols="20" fluid />
                    </div>
                    <div>
                        <label for="inventoryStatus" class="block font-bold mb-3">Inventory Status</label>
                        <Select id="inventoryStatus" v-model="product.inventoryStatus" :options="statuses" optionLabel="label" placeholder="Select a Status" fluid></Select>
                    </div>

                    <div>
                        <span class="block font-bold mb-4">Category</span>
                        <div class="grid grid-cols-12 gap-4">
                            <div class="flex items-center gap-2 col-span-6">
                                <RadioButton id="category1" v-model="product.category" name="category" value="Accessories" />
                                <label for="category1">Accessories</label>
                            </div>
                            <div class="flex items-center gap-2 col-span-6">
                                <RadioButton id="category2" v-model="product.category" name="category" value="Clothing" />
                                <label for="category2">Clothing</label>
                            </div>
                            <div class="flex items-center gap-2 col-span-6">
                                <RadioButton id="category3" v-model="product.category" name="category" value="Electronics" />
                                <label for="category3">Electronics</label>
                            </div>
                            <div class="flex items-center gap-2 col-span-6">
                                <RadioButton id="category4" v-model="product.category" name="category" value="Fitness" />
                                <label for="category4">Fitness</label>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-6">
                            <label for="price" class="block font-bold mb-3">Price</label>
                            <InputNumber id="price" v-model="product.price" mode="currency" currency="USD" locale="en-US" fluid />
                        </div>
                        <div class="col-span-6">
                            <label for="quantity" class="block font-bold mb-3">Quantity</label>
                            <InputNumber id="quantity" v-model="product.quantity" integeronly fluid />
                        </div>
                    </div>
                </div>

                <template #footer>
                    <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                    <Button label="Save" icon="pi pi-check" @click="saveProduct" />
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

            <Dialog v-model:visible="deleteProductsDialog" :style="{ width: '450px' }" header="Confirm" :modal="true">
                <div class="flex items-center gap-4">
                    <i class="pi pi-exclamation-triangle !text-3xl" />
                    <span v-if="product">Are you sure you want to delete the selected products?</span>
                </div>
                <template #footer>
                    <Button label="No" icon="pi pi-times" text @click="deleteProductsDialog = false" />
                    <Button label="Yes" icon="pi pi-check" text @click="deleteSelectedProducts" />
                </template>
            </Dialog>
    </div>
</template>

<script setup>
import { ref, onBeforeMount } from 'vue';
import axios from 'axios';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

const invoices = ref([]);
let expandedRows = []; // Non-reactive for manual control
const loading = ref(true);

onBeforeMount(() => {
    fetchInvoices();
});
function confirmDeleteSelected() {
    deleteProductsDialog.value = true;
}

function deleteSelectedProducts() {
    products.value = products.value.filter((val) => !selectedProducts.value.includes(val));
    deleteProductsDialog.value = false;
    selectedProducts.value = null;
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Products Deleted', life: 3000 });
}
async function printInvoice(id) {
    try {
        const response = await axios.get(`http://localhost:8000/api/invoices/${id}/pdf`, {
            responseType: 'blob', 
        });

        // Create a download link for the PDF
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoice_${id}.pdf`); // Name the file
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error(`Error printing invoice ${id}:`, error);
    }
}
async function fetchInvoices() {
    try {
        loading.value = true;
        const response = await axios.get('http://localhost:8000/api/invoices');
        
        invoices.value = response.data.map((invoice) => ({
            ...invoice,
            invoice_date: new Date(invoice.invoice_date), 
            items: invoice.items.map(item => ({
                ...item,
                unit_price: parseFloat(item.unit_price), 
                total_price: parseFloat(item.total_price),
            }))
        }));
    } catch (error) {
        console.error('Error fetching invoices:', error);
    } finally {
        loading.value = false;
    }
}


function formatCurrency(value) {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatDate(value) {
    return value.toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}
</script>

<style scoped>
.card {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #fff;
}
</style>
