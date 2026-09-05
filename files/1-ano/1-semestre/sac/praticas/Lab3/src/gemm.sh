#!/bin/sh
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --time=00:02:00
#SBATCH --partition=acomp

module load gcc/5.3.0
module load papi/5.4.1

./gemm $1 $2

