#!/bin/sh
#SBATCH --nodes=1
#SBATCH --tasks=1
#SBATCH --time=00:01:00
#SBATCH --partition=acomp

module load papi/5.4.1
papi_avail

