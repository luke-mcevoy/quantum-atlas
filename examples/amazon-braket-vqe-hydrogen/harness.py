# create a directory named "data" to store intermediate classical computation results from OpenFermion
import os
os.makedirs("data", exist_ok=True)
# import required libraries
import os
import time

import numpy as np
from matplotlib import pyplot as plt
from openfermion import MolecularData
from openfermion.transforms import get_fermion_operator, jordan_wigner
from openfermionpyscf import run_pyscf

from braket.circuits import Circuit, observables
from braket.devices import LocalSimulator
from braket.parametric import FreeParameter
# Initialize variable to determine total run-time of the program
run_time = time.time()
# Set parameters that won't change for all simulations
# total charge
tot_chg = 0
# set the multiplicity
# this parameter specifies how electrons are paired in orbitals
# spin multiplicity is equal to the number of unpaired electrons plus one
# e.g., spin multiplicity = 1 implies no unpaired electron, i.e., for every
# spin-up electron in a spatial orbital there is a spin-down electron,
# spin-multiplicity = 3 implies 2 unpaired electrons, and so on.
# See https://en.wikipedia.org/wiki/Multiplicity_(chemistry) for more details
spin_mult = 1
# use the minimal basis set (STO-3G)
basis_set = "sto-3g"
# number of active electrons and orbitals to consider
# For H2 as we're consider all electrons and orbitals as active for STO-3G
occ_ind = act_ind = None
# bond lengths to simulate ground-state of H2 for (in Angstroms)
bond_lengths = np.arange(start=0.24, stop=3.00, step=0.1)
# no. of bond lengths to simulate H2 for
n_configs = len(bond_lengths)
print(f"INFO: Simulating ground-state of H2 molecule for {n_configs} bond lengths")
# no. of VQE parameter values to scan
n_theta = 24
# no. of shots: 0 means exact statevector expectation values (no sampling noise)
n_shots = 0
# Dictionary to store molecular data and qubit Hamiltonians for each
# molecular configuration(i.e., bond length)
mol_configs = {}
# Store molecular config data and Hamiltonian for each bond length
for rr in bond_lengths:
    # round to 2 digits to get a reasonable-length number for bond-length
    r = round(rr, 2)
    print(f"INFO: Computing Hamiltonian for bond-length {r} A...")
    geom = [("H", (0.0, 0.0, -r / 2.0)), ("H", (0.0, 0.0, r / 2.0))]
    # Make sure a directory named 'data' exists in the current folder,
    # else this statement will throw an error!
    h2_molecule = MolecularData(
        geometry=geom,
        basis=basis_set,
        multiplicity=spin_mult,
        description="bondlength_" + str(r) + "A",
        filename="",
        data_directory=os.getcwd() + "/data",
    )
    # Run PySCF to get molecular integrals, HF and FCI energies
    h2_molecule = run_pyscf(
        molecule=h2_molecule,
        run_scf=True,
        run_mp2=False,
        run_cisd=False,
        run_ccsd=False,
        run_fci=True,
        verbose=False,
    )
    # Convert electronic Hamiltonian to qubit operator using JW encoding
    h2_qubit_hamiltonian = jordan_wigner(
        get_fermion_operator(
            h2_molecule.get_molecular_hamiltonian(occupied_indices=occ_ind, active_indices=act_ind),
        ),
    )
    # store molecular data and qubit operator for this config in an ordered list
    mol_configs[r] = [h2_molecule, h2_qubit_hamiltonian]
print(f"INFO: Computed Hamiltonians for {len(mol_configs)} bond-lengths.")
# Construct circuit for UCCSD ansatz parameterized by VQE parameter per McArdle et al.
a_theta = FreeParameter("a_theta")
# Initialize HF state |0011>
ansatz_uccsd = Circuit().x(2).x(3)
# Perform initial rotations to measure in Y & X bases
ansatz_uccsd.rx(3, np.pi / 2.0).h(range(3))
# Entangle with CNOTs
ansatz_uccsd.cnot(3, 2).cnot(2, 1).cnot(1, 0)
# Perform the rotation in Z-basis
ansatz_uccsd.rz(0, a_theta)
# Uncompute the rotations
ansatz_uccsd.cnot(1, 0).cnot(2, 1).cnot(3, 2)
ansatz_uccsd.h(range(3))
ansatz_uccsd.rx(3, -np.pi / 2.0)

# initialize quantum device to run VQE over
local_sim = LocalSimulator()
# verify by running the circuit with no rotation and verifying we get HF state
print(ansatz_uccsd)
n_qubits = ansatz_uccsd.qubit_count
print(f"Total number of qubits in the circuit: {n_qubits}")
# We can fix the value of a_theta by calling the circuit with the value filled as follows.
# print(local_sim.run(ansatz_uccsd(0)).result().state_vector)
print(
    local_sim.run(Circuit().add(ansatz_uccsd(0)).state_vector(), shots=n_shots).result().values[0]
)
# We can also fix the value of a_theta by supplying the inputs argument to run
print(
    local_sim.run(
        Circuit().add(ansatz_uccsd).state_vector(), shots=n_shots, inputs={"a_theta": 0.0}
    )
    .result()
    .values[0],
)
def _build_observable(indices_gates):
    """Convert OpenFermion term to a Braket observable."""
    obs_map = {"X": observables.X, "Y": observables.Y, "Z": observables.Z}
    factors = [obs_map[gate](n_qubits - 1 - ind) for ind, gate in indices_gates]
    return observables.TensorProduct(factors) if len(factors) > 1 else factors[0]


def H_exp(a_qH, a_ckt, a_dev, a_shots=n_shots):
    """Get expectation value of Hamiltonian for a given circuit result.

    Batches all non-identity Pauli terms into a single circuit run,
    so the statevector is computed once and all observables are evaluated against it.

    Note: This implementation adds multiple observables to a single circuit, which
    works for simulators. For QPU execution, non-commuting terms would need to be
    measured in separate circuit runs.

    Parameters
    ----------
        a_qH [OpenFermion QubitHamiltonian.terms]: Dictionary of OpenFermion QubitHamiltonian operator terms
        a_ckt [Braket Circuit]: Circuit to create the final state
        a_dev [Braket Device]: Quantum device to run a_ckt on
        a_shots [int]: No. of shots (0 for exact statevector expectation values)
    Returns:
        H_e [float]: Expectation value of a_qH for a_ket

    """
    H_e = 0.0
    measuring_ckt = Circuit().add(a_ckt)
    coeffs = []
    for term in a_qH:
        coeff = np.real(a_qH[term])
        if not term:
            # identity term contributes coeff * 1
            H_e += coeff
        else:
            measuring_ckt.expectation(observable=_build_observable(term))
            coeffs.append(coeff)
    # Single simulator run for all non-identity terms
    result = a_dev.run(measuring_ckt, shots=a_shots).result()
    for coeff, val in zip(coeffs, result.values):
        H_e += coeff * val
    return H_e
# Loop over all bond lengths
for r in mol_configs:
    print(f"INFO: Computing ground-state energy for bond-length {r} A...")
    # initialize min_energy for this config
    mol_configs[r].append(np.inf)
    # Loop over all VQE parameter values
    for theta in np.linspace(start=-np.pi, stop=np.pi, num=n_theta, endpoint=False):
        # get expectation value of this config's Hamiltonian for this parameter value
        exp_H_theta = H_exp(mol_configs[r][1].terms, ansatz_uccsd(theta), local_sim)
        # if this expectation value is less than min found so far, update it
        mol_configs[r][2] = min(exp_H_theta, mol_configs[r][2])
    print(f"min <H(R={r} A)> = {mol_configs[r][2]:.4f} Ha")
# Plot ground-state energy for each configuration vs bond length
plt.figure(figsize=(8, 6), dpi=700)
plt.plot(list(mol_configs.keys()), [val[0].hf_energy for val in mol_configs.values()], label="HF")
plt.plot(list(mol_configs.keys()), [val[0].fci_energy for val in mol_configs.values()], label="FCI")
plt.plot(list(mol_configs.keys()), [val[2] for val in mol_configs.values()], "x-", label="VQE")
plt.grid()
plt.xlabel("Bond length of H2 [A]")
plt.ylabel("Ground-state energy for H2 [Ha]")
plt.legend()
plt.title("VQE computed ground-state energy of H2 vs bond-length for STO-3G basis vs HF and FCI")
plt.savefig("H2_PES_byVQE.png")
run_time = time.time() - run_time
print(f"Total running time: {run_time:.2f} s")
