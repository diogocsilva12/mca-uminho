#include <iostream>
#include <vector>
#include <chrono>
#include <cmath>
#include <cuda_runtime.h>

// Macro para verificar erros do CUDA (essencial para debug)
#define CUDA_CHECK(call) \
    do { \
        cudaError_t err = call; \
        if (err != cudaSuccess) { \
            std::cerr << "CUDA Error: " << cudaGetErrorString(err) << " at line " << __LINE__ << std::endl; \
            exit(1); \
        } \
    } while (0)

// O KERNEL (O código que corre na placa gráfica)
__global__ void jacobi_kernel(const double* __restrict__ read_grid,
                              double* __restrict__ write_grid,
                              int nx, int ny, int nz, double C)
{
    // Mapeamento: x=k (fastest), y=j, z=i
    int k = blockIdx.x * blockDim.x + threadIdx.x;
    int j = blockIdx.y * blockDim.y + threadIdx.y;
    int i = blockIdx.z * blockDim.z + threadIdx.z;

    // Verificar se estamos dentro dos limites (excluindo fronteiras)
    if (i >= 1 && i < nx - 1 && j >= 1 && j < ny - 1 && k >= 1 && k < nz - 1) {

        // Calcular índice linear 1D
        int idx = (i * ny * nz) + (j * nz) + k;

        // Offsets para vizinhos
        int slice = ny * nz;
        int row = nz;

        double self = read_grid[idx];

        double sum = read_grid[idx + row] +   // North
                     read_grid[idx - row] +   // South
                     read_grid[idx + slice] + // East
                     read_grid[idx - slice] + // West
                     read_grid[idx + 1] +     // Up
                     read_grid[idx - 1];      // Down

        write_grid[idx] = self + C * (sum - 6.0 * self);
    }
}

// Função Host
void run_gpu_stencil(std::vector<double>& h_grid, int nx, int ny, int nz, int steps) {
    size_t size_bytes = nx * ny * nz * sizeof(double);
    double *d_A, *d_B;

    // 1. Alocar memória na GPU
    CUDA_CHECK(cudaMalloc((void**)&d_A, size_bytes));
    CUDA_CHECK(cudaMalloc((void**)&d_B, size_bytes));

    // 2. Copiar dados do CPU -> GPU
    CUDA_CHECK(cudaMemcpy(d_A, h_grid.data(), size_bytes, cudaMemcpyHostToDevice));
    // Inicializar B com cópia de A
    CUDA_CHECK(cudaMemcpy(d_B, d_A, size_bytes, cudaMemcpyDeviceToDevice));

    // 3. Configurar Dimensões (Blocos e Threads)
    // Usamos 32 em X para alinhar com o Warp size (32 threads) para acesso rápido à memória
    dim3 threadsPerBlock(32, 4, 4); // 512 threads por bloco

    dim3 numBlocks(
        (nz + threadsPerBlock.x - 1) / threadsPerBlock.x,
        (ny + threadsPerBlock.y - 1) / threadsPerBlock.y,
        (nx + threadsPerBlock.z - 1) / threadsPerBlock.z
    );

    const double C = 0.1;

    // 4. Loop Temporal
    auto start = std::chrono::high_resolution_clock::now();

    for (int t = 0; t < steps; ++t) {
        // Lança o kernel
        jacobi_kernel<<<numBlocks, threadsPerBlock>>>(d_A, d_B, nx, ny, nz, C);

        // Troca os ponteiros (Ping-Pong)
        std::swap(d_A, d_B);
    }

    // Esperar que a GPU acabe
    CUDA_CHECK(cudaDeviceSynchronize());

    auto end = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> elapsed = end - start;

    // 5. Copiar resultado de volta (GPU -> CPU)
    // Nota: Como fizemos swap, o resultado mais recente pode estar em d_A ou d_B.
    // Se steps for par, o resultado está em d_A (que era o original). Se ímpar, d_B.
    // Mas no swap std::swap trocou as variaveis C++, então d_A aponta sempre para o "input da proxima iteração".
    // O ultimo output foi escrito em "d_B" antes do ultimo swap... confusão de pointers.
    // Simplificação: Copiamos d_A porque o swap acontece NO FIM do loop.
    // Na iteração t, lemos de A, escrevemos em B, swap. A passa a ter os dados novos.
    CUDA_CHECK(cudaMemcpy(h_grid.data(), d_A, size_bytes, cudaMemcpyDeviceToHost));

    // Métricas
    double total_flops = (double)(nx-2)*(ny-2)*(nz-2) * 8.0 * steps;
    double gflops = (total_flops / elapsed.count()) / 1e9;

    std::cout << "--- GPU CUDA Results ---" << std::endl;
    std::cout << "Time: " << elapsed.count() << " s" << std::endl;
    std::cout << "Perf: " << gflops << " GFlops/s" << std::endl;

    // Limpar memória
    cudaFree(d_A);
    cudaFree(d_B);
}

void initialize_grid(std::vector<double>& grid, size_t nx, size_t ny, size_t nz) {
    // Mesma inicialização do original
    for (size_t i = 0; i < nx; ++i) {
        for (size_t j = 0; j < ny; ++j) {
            for (size_t k = 0; k < nz; ++k) {
                size_t idx = (i * ny * nz) + (j * nz) + k;
                if (i==0 || i==nx-1 || j==0 || j==ny-1 || k==0 || k==nz-1) grid[idx] = 1.0;
                else grid[idx] = 0.0;
            }
        }
    }
    grid[(nx/2*ny*nz) + (ny/2*nz) + (nz/2)] = 100.0;
}

int main(int argc, char* argv[]) {
    if (argc != 5) return 1;
    int nx = std::stoi(argv[1]);
    int ny = std::stoi(argv[2]);
    int nz = std::stoi(argv[3]);
    int steps = std::stoi(argv[4]);

    std::vector<double> grid(nx * ny * nz);
    initialize_grid(grid, nx, ny, nz);

    run_gpu_stencil(grid, nx, ny, nz, steps);

    return 0;
}