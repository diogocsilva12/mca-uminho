#!/bin/sh
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=64
#SBATCH --time=00:10:00
#SBATCH --partition=normal-x86
#SBATCH --account=f202500010hpcvlabuminhox

module load GCC/13.2.0

make
# Definir número de threads OpenMP
export OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK
export OMP_PROC_BIND=close
export OMP_PLACES=cores

echo "=== TESTE 1: L1 Cache (Size 14) ==="
./bin/jacobi_base 14 14 14 1000
./bin/jacobi_omp 14 14 14 1000

echo "=== TESTE 2: LLC Cache (Size 100) ==="
./bin/jacobi_base 100 100 100 100
./bin/jacobi_omp 100 100 100 100

echo "=== TESTE 3: RAM Bound (Size 512) ==="
./bin/jacobi_base 512 512 512 20
./bin/jacobi_omp 512 512 512 20

