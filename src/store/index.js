import apiClient from '@/axios';
import { createStore } from 'vuex';

const store = createStore({
    state: {
        authToken: localStorage.getItem('token') || null
    },
    mutations: {
        setAuthToken(state, token) {
            state.authToken = token;
        }
    },
    actions: {
        async login({ commit }, { email, password }) {
            try {
                const response = await apiClient.post('/login', { email, password });
                const token = response.data.token;

                commit('setAuthToken', token);
                localStorage.setItem('token', token);
            } catch (error) {
                throw new Error('Invalid email or password');
            }
        }
    },
    getters: {
        isAuthenticated: (state) => !!state.authToken
    }
});

export default store;
