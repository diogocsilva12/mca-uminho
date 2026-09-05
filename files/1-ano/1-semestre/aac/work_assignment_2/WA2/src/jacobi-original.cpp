/*
 * jacobi.cpp
 *
 * This program implements a 3D 7-point Jacobi stencil, a classic example of
 * a memory-bandwidth-bound algorithm. It uses a naive "streaming"
 * implementation where each time step reads the entire grid from
 * main memory and writes the new grid back.
 *
 * Build:
 *   g++ -o solve_mem -O3 -std=c++17 -fopenmp jacobi_memory_bound.cpp
 * Might need the flag -D_ISOC23_SOURCE=0 depending on version
 * Run:
 * ./solve_mem <nx> <ny> <nz> <num_steps>
 * Example:
 * ./solve_mem 256 256 256 10
 */

#include <iostream>
#include <vector>
#include <string>
#include <cstdlib>
#include <chrono>
#include <cmath>
#include <iomanip>
#include <stdexcept>
#include <algorithm> // for std::swap


//
// --- KERNEL CONFIGURATION ---
//
// The 7-point stencil kernel.
// This is the function students will optimize (e.g., vectorization, ILP).
//
inline void kernel_compute_point(
    double* read_grid_ptr,
    double* write_grid_ptr,
    size_t i, size_t j, size_t k,
    size_t ny, size_t nz,
    double C)
{
    size_t current_idx = (i * ny * nz) + (j * nz) + k;
    
    // The "self" point
    double self = read_grid_ptr[current_idx];

    // The 6 neighbors
    double n_north = read_grid_ptr[current_idx + nz];       // (i, j+1, k)
    double n_south = read_grid_ptr[current_idx - nz];       // (i, j-1, k)
    double n_east  = read_grid_ptr[current_idx + (ny*nz)]; // (i+1, j, k)
    double n_west  = read_grid_ptr[current_idx - (ny*nz)]; // (i-1, j, k)
    double n_up    = read_grid_ptr[current_idx + 1];        // (i, j, k+1)
    double n_down  = read_grid_ptr[current_idx - 1];        // (i, j, k-1)

    // --- KERNEL ---
    // 8 FLOPs per point
    // 7 reads, 1 write
    // AI = 8 FLOPs / (8 reads/writes * 8 bytes/double) = 0.125 FLOPs/Byte
    // This is extremely low, hence MEMORY-BOUND.
    
    double neighbor_sum = n_north + n_south + n_east + n_west + n_up + n_down;
    
    write_grid_ptr[current_idx] = self + C * (neighbor_sum - 6.0 * self);
}

/**
 * @brief Runs the memory-bound 7-point stencil for num_steps.
 */
void run_base_stencil(
    std::vector<double>& grid_a,
    std::vector<double>& grid_b,
    size_t nx, size_t ny, size_t nz,
    size_t num_steps) 
{
    // Pointers for swapping grids
    double* read_grid_ptr = grid_a.data();
    double* write_grid_ptr = grid_b.data();

    // Diffusion constant
    const double C = 0.1;

    // Time-stepping loop
    for (size_t t = 0; t < num_steps; ++t) {
        
        // Main stencil computation loops
        // We iterate from 1 to N-1 to avoid boundary checks
        // Students can parallelize this outer loop with OpenMP
        #pragma omp parallel for schedule(static)
        for (size_t i = 1; i < nx - 1; ++i) {
            for (size_t j = 1; j < ny - 1; ++j) {
                // The innermost loop (k) is the one to vectorize
                for (size_t k = 1; k < nz - 1; ++k) {
                    kernel_compute_point(read_grid_ptr, write_grid_ptr, i, j, k, ny, nz, C);
                }
            }
        }
        
        // Swap grids for the next iteration
        std::swap(read_grid_ptr, write_grid_ptr);
    }
}

/**
 * @brief Initializes the 3D grid.
 */
void initialize_grid(std::vector<double>& grid, size_t nx, size_t ny, size_t nz) {
    size_t total_size = nx * ny * nz;
    for (size_t i = 0; i < nx; ++i) {
        for (size_t j = 0; j < ny; ++j) {
            for (size_t k = 0; k < nz; ++k) {
                size_t current_idx = (i * ny * nz) + (j * nz) + k;
                if (i == 0 || i == nx - 1 || j == 0 || j == ny - 1 || k == 0 || k == nz - 1) {
                    grid[current_idx] = 1.0; // Boundary
                } else {
                    grid[current_idx] = 0.0; // Interior
                }
            }
        }
    }
    // Add a hot-spot in the middle
    grid[(nx / 2 * ny * nz) + (ny / 2 * nz) + (nz / 2)] = 100.0;
}


int main(int argc, char* argv[]) {
    if (argc!= 5) {
        std::cerr << "Usage: " << argv << " <nx> <ny> <nz> <num_steps>" << std::endl;
        return 1;
    }

    // Parse command-line arguments
    size_t nx = 0, ny = 0, nz = 0, num_steps = 0;
    try {
        nx = std::stoull(argv[1]);
        ny = std::stoull(argv[2]);
        nz = std::stoull(argv[3]);
        num_steps = std::stoull(argv[4]);
    } catch (const std::exception& e) {
        std::cerr << "Error: Invalid arguments. " << e.what() << std::endl;
        return 1;
    }
    
    if (nx < 3 || ny < 3 || nz < 3 || num_steps < 1) {
         std::cerr << "Error: Dimensions must be >= 3 and steps >= 1." << std::endl;
         return 1;
    }

    size_t total_size = nx * ny * nz;
    size_t inner_size = (nx - 2) * (ny - 2) * (nz - 2);

    std::cout << "--- 3D Jacobi Stencil (Memory-Bound) ---" << std::endl;
    std::cout << "Grid Dimensions: " << nx << " x " << ny << " x " << nz << " (" << total_size << " points)" << std::endl;
    std::cout << "Time Steps:      " << num_steps << std::endl;
    std::cout << "Memory:          " << (total_size * sizeof(double) * 2 / 1024.0 / 1024.0) << " MB" << std::endl;

    // Allocate and initialize grids
    std::vector<double> grid_a(total_size);
    std::vector<double> grid_b(total_size);
    initialize_grid(grid_a, nx, ny, nz);

    // Start timer
    auto start_time = std::chrono::high_resolution_clock::now();

    // Run the stencil
    run_base_stencil(grid_a, grid_b, nx, ny, nz, num_steps);

    // Stop timer
    auto end_time = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double> elapsed = end_time - start_time;

    // Calculate performance
    // 8 FLOPs per point per time step
    double flops_per_step = static_cast<double>(inner_size) * 8.0;
    double total_flops = flops_per_step * static_cast<double>(num_steps);
    double gflops_per_sec = (total_flops / elapsed.count()) / 1e9;
    
    // Calculate bandwidth
    // 7 reads + 1 write = 8 accesses * 8 bytes/double = 64 bytes
    double bytes_per_step = static_cast<double>(inner_size) * 64.0;
    double total_bytes = bytes_per_step * static_cast<double>(num_steps);
    double gbytes_per_sec = (total_bytes / elapsed.count()) / 1e9;

    std::cout << std::fixed << std::setprecision(4);
    std::cout << "------------------------------------------" << std::endl;
    std::cout << "Elapsed Time:  " << elapsed.count() << " seconds" << std::endl;
    std::cout << "Total FLOPs:   " << (total_flops / 1e9) << " GFLOPs" << std::endl;
    std::cout << "Performance:   " << gflops_per_sec << " GFLOPS/s" << std::endl;
    std::cout << "Est. Bandwidth: " << gbytes_per_sec << " GB/s" << std::endl;
    std::cout << "------------------------------------------" << std::endl;
    return 0;
}
