#include <iostream>
#include <vector>
#include <chrono>
#include <cmath>
#include <iomanip>
#include <algorithm>
#include <omp.h> // Importante para OpenMP

// Função para inicializar (igual à original)
void initialize_grid(std::vector<double>& grid, size_t nx, size_t ny, size_t nz) {
    // Inicialização idêntica à original para garantir comparação justa
    for (size_t i = 0; i < nx; ++i) {
        for (size_t j = 0; j < ny; ++j) {
            for (size_t k = 0; k < nz; ++k) {
                size_t idx = (i * ny * nz) + (j * nz) + k;
                if (i == 0 || i == nx - 1 || j == 0 || j == ny - 1 || k == 0 || k == nz - 1)
                    grid[idx] = 1.0;
                else
                    grid[idx] = 0.0;
            }
        }
    }
    grid[(nx / 2 * ny * nz) + (ny / 2 * nz) + (nz / 2)] = 100.0;
}

void run_optimized_stencil(
    std::vector<double>& grid_a,
    std::vector<double>& grid_b,
    size_t nx, size_t ny, size_t nz,
    size_t num_steps)
{
    double* read_ptr = grid_a.data();
    double* write_ptr = grid_b.data();
    const double C = 0.1;

    // Constantes de passo para evitar cálculos repetidos
    const size_t slice = ny * nz;
    const size_t row = nz;

    for (size_t t = 0; t < num_steps; ++t) {

        // OTIMIZAÇÃO 1: OpenMP Parallel For
        // 'collapse(2)' funde os loops i e j para criar mais tarefas paralelas
        // 'schedule(static)' é geralmente melhor para stencils regulares
        #pragma omp parallel for collapse(2) schedule(static)
        for (size_t i = 1; i < nx - 1; ++i) {
            for (size_t j = 1; j < ny - 1; ++j) {

                // Pré-calcula índices base para evitar multiplicações no loop interno
                size_t base_idx = (i * slice) + (j * row);

                // OTIMIZAÇÃO 2: Loop interno limpo para Vetorização (SIMD)
                // O compilador vai tentar usar AVX/SVE aqui porque o acesso é contíguo
                #pragma omp simd
                for (size_t k = 1; k < nz - 1; ++k) {
                    size_t curr = base_idx + k;

                    double self = read_ptr[curr];

                    // Vizinhos (acessos diretos via offset)
                    double sum_neighbors =
                        read_ptr[curr + row] +   // North
                        read_ptr[curr - row] +   // South
                        read_ptr[curr + slice] + // East
                        read_ptr[curr - slice] + // West
                        read_ptr[curr + 1] +     // Up
                        read_ptr[curr - 1];      // Down

                    write_ptr[curr] = self + C * (sum_neighbors - 6.0 * self);
                }
            }
        }
        std::swap(read_ptr, write_ptr);
    }
}

int main(int argc, char* argv[]) {
    if (argc != 5) {
        std::cerr << "Usage: " << argv[0] << " <nx> <ny> <nz> <steps>" << std::endl;
        return 1;
    }
    size_t nx = std::stoull(argv[1]);
    size_t ny = std::stoull(argv[2]);
    size_t nz = std::stoull(argv[3]);
    size_t steps = std::stoull(argv[4]);

    size_t total_points = nx * ny * nz;
    std::vector<double> ga(total_points), gb(total_points);
    initialize_grid(ga, nx, ny, nz);

    std::cout << "--- Jacobi OTIMIZADO (OpenMP) ---" << std::endl;
    std::cout << "Threads: " << omp_get_max_threads() << std::endl;

    auto start = std::chrono::high_resolution_clock::now();
    run_optimized_stencil(ga, gb, nx, ny, nz, steps);
    auto end = std::chrono::high_resolution_clock::now();

    std::chrono::duration<double> elapsed = end - start;

    // Métricas simples para validação rápida
    double inner_points = (nx - 2) * (ny - 2) * (nz - 2);
    double gflops = (inner_points * 8.0 * steps) / elapsed.count() / 1e9;
    double gbytes = (inner_points * 64.0 * steps) / elapsed.count() / 1e9;

    std::cout << "Time: " << elapsed.count() << " s" << std::endl;
    std::cout << "Perf: " << gflops << " GFlops/s" << std::endl;
    std::cout << "BW:   " << gbytes << " GB/s" << std::endl;

    return 0;
}